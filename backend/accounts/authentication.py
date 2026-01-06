"""
Custom authentication for Supabase integration.

Validates JWT tokens from Supabase and syncs user data with Django.
"""
import logging
from django.conf import settings
from rest_framework import authentication, exceptions
import jwt
import requests
from .models import User, UserRole

logger = logging.getLogger(__name__)


class SupabaseAuthentication(authentication.BaseAuthentication):
    """
    Custom authentication class for Supabase JWT tokens.
    
    Validates the token with Supabase and creates/updates the user in Django.
    """
    
    def authenticate(self, request):
        """
        Authenticate the request and return a tuple of (user, token) or None.
        """
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        
        if not auth_header.startswith('Bearer '):
            return None
        
        token = auth_header.split(' ')[1]
        
        try:
            # Decode the JWT token
            # In production, verify the signature with Supabase's public key
            payload = self._decode_token(token)
            
            if not payload:
                raise exceptions.AuthenticationFailed('Invalid token')
            
            # Get or create user from Supabase data
            user = self._get_or_create_user(payload)
            
            return (user, token)
            
        except jwt.ExpiredSignatureError:
            raise exceptions.AuthenticationFailed('Token has expired')
        except jwt.InvalidTokenError as e:
            logger.error(f"Invalid JWT token: {e}")
            raise exceptions.AuthenticationFailed('Invalid token')
        except Exception as e:
            logger.error(f"Authentication error: {e}")
            raise exceptions.AuthenticationFailed(str(e))
    
    def _decode_token(self, token):
        """
        Decode and validate the Supabase JWT token.
        
        In development, we decode without verification.
        In production, verify with Supabase's JWT secret.
        """
        try:
            # For development: decode without verification
            # For production: use your Supabase JWT secret
            if settings.DEBUG:
                payload = jwt.decode(token, options={"verify_signature": False})
            else:
                # Get the JWT secret from Supabase settings
                jwt_secret = settings.SUPABASE_KEY
                payload = jwt.decode(token, jwt_secret, algorithms=["HS256"])
            
            return payload
        except Exception as e:
            logger.error(f"Token decode error: {e}")
            return None
    
    def _get_or_create_user(self, payload):
        """
        Get or create a Django user from Supabase JWT payload.
        """
        supabase_uid = payload.get('sub')
        email = payload.get('email')
        
        if not supabase_uid or not email:
            raise exceptions.AuthenticationFailed('Invalid token payload')
        
        # Try to find existing user
        try:
            user = User.objects.get(supabase_uid=supabase_uid)
            # Update user info if needed
            if user.email != email:
                user.email = email
                user.save(update_fields=['email'])
            return user
        except User.DoesNotExist:
            pass
        
        # Check if user exists by email (migrating from another auth)
        try:
            user = User.objects.get(email=email)
            user.supabase_uid = supabase_uid
            user.save(update_fields=['supabase_uid'])
            return user
        except User.DoesNotExist:
            pass
        
        # Create new user
        user_metadata = payload.get('user_metadata', {})
        
        user = User.objects.create(
            email=email,
            supabase_uid=supabase_uid,
            full_name=user_metadata.get('full_name', ''),
            avatar_url=user_metadata.get('avatar_url', ''),
            role=UserRole.DONOR,  # Default role for new users
        )
        
        logger.info(f"Created new user from Supabase: {email}")
        return user


class WalletSignatureAuthentication(authentication.BaseAuthentication):
    """
    Authentication using Ethereum wallet signatures.
    
    Verifies that the user owns the wallet by checking the signature.
    """
    
    def authenticate(self, request):
        """
        Authenticate using wallet signature.
        """
        address = request.META.get('HTTP_X_WALLET_ADDRESS', '')
        signature = request.META.get('HTTP_X_WALLET_SIGNATURE', '')
        message = request.META.get('HTTP_X_WALLET_MESSAGE', '')
        
        if not all([address, signature, message]):
            return None
        
        try:
            from eth_account.messages import encode_defunct
            from eth_account import Account
            
            # Verify the signature
            message_hash = encode_defunct(text=message)
            recovered_address = Account.recover_message(message_hash, signature=signature)
            
            if recovered_address.lower() != address.lower():
                raise exceptions.AuthenticationFailed('Invalid wallet signature')
            
            # Find user with this wallet
            from .models import Wallet
            try:
                wallet = Wallet.objects.select_related('user').get(address__iexact=address)
                return (wallet.user, None)
            except Wallet.DoesNotExist:
                raise exceptions.AuthenticationFailed('Wallet not registered')
                
        except Exception as e:
            logger.error(f"Wallet authentication error: {e}")
            raise exceptions.AuthenticationFailed(str(e))
