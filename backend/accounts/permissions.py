"""
Custom permissions for the accounts app.
"""
from rest_framework import permissions


class IsAdmin(permissions.BasePermission):
    """
    Permission check for admin/NGO users.
    """
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.is_admin


class IsAdminOrReadOnly(permissions.BasePermission):
    """
    Allow read access to everyone, write access only to admins.
    """
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user.is_authenticated and request.user.is_admin


class IsOwnerOrAdmin(permissions.BasePermission):
    """
    Permission check for object owners or admins.
    """
    def has_object_permission(self, request, view, obj):
        # Admins can access everything
        if request.user.is_admin:
            return True
        
        # Check if the object has a user attribute
        if hasattr(obj, 'user'):
            return obj.user == request.user
        
        # If the object is a user, check if it's the same user
        if hasattr(obj, 'email'):
            return obj == request.user
        
        return False


class IsBeneficiary(permissions.BasePermission):
    """
    Permission check for beneficiary users.
    """
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.is_beneficiary


class IsVerified(permissions.BasePermission):
    """
    Permission check for verified users.
    """
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.is_verified


class IsAuditor(permissions.BasePermission):
    """
    Permission check for auditor users (read-only access).
    """
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        
        if request.user.role == 'auditor':
            # Auditors only get read access
            return request.method in permissions.SAFE_METHODS
        
        return True
