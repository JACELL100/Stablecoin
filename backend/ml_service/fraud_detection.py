"""
Fraud Detection Service using Isolation Forest.

This module implements anomaly detection for disaster relief spending patterns
to identify potentially fraudulent transactions.
"""
import logging
import numpy as np
import pandas as pd
from datetime import timedelta
from typing import Dict, List, Tuple, Optional
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
import joblib
from pathlib import Path

logger = logging.getLogger(__name__)

# Path to saved models
MODEL_DIR = Path(__file__).parent / 'models'
MODEL_DIR.mkdir(exist_ok=True)


class FraudDetector:
    """
    Anomaly detection for relief fund spending patterns.
    
    Uses Isolation Forest to identify unusual spending behavior that may
    indicate fraud, category misuse, or rapid spending bursts.
    """
    
    def __init__(self, contamination: float = 0.1):
        """
        Initialize the fraud detector.
        
        Args:
            contamination: Expected proportion of anomalies (0.1 = 10%)
        """
        self.contamination = contamination
        self.model: Optional[IsolationForest] = None
        self.scaler = StandardScaler()
        self.is_fitted = False
        self.feature_names = [
            'amount',
            'hour_of_day',
            'day_of_week',
            'transactions_last_hour',
            'transactions_last_day',
            'total_spent_last_day',
            'avg_transaction_amount',
            'amount_deviation',
            'category_match_rate',
            'time_since_last_transaction',
        ]
    
    def extract_features(self, transaction_data: Dict, history: List[Dict]) -> np.ndarray:
        """
        Extract features from a transaction and its history.
        
        Args:
            transaction_data: Current transaction info
            history: List of previous transactions for this beneficiary
            
        Returns:
            Feature vector as numpy array
        """
        features = {}
        
        # Basic transaction features
        features['amount'] = float(transaction_data.get('amount', 0))
        
        # Time-based features
        timestamp = transaction_data.get('timestamp')
        if timestamp:
            features['hour_of_day'] = timestamp.hour
            features['day_of_week'] = timestamp.weekday()
        else:
            features['hour_of_day'] = 12
            features['day_of_week'] = 0
        
        # History-based features
        if history:
            df = pd.DataFrame(history)
            
            # Recent activity
            one_hour_ago = timestamp - timedelta(hours=1) if timestamp else None
            one_day_ago = timestamp - timedelta(days=1) if timestamp else None
            
            if one_hour_ago:
                recent_hour = [h for h in history if h.get('timestamp', timestamp) >= one_hour_ago]
                features['transactions_last_hour'] = len(recent_hour)
            else:
                features['transactions_last_hour'] = 0
            
            if one_day_ago:
                recent_day = [h for h in history if h.get('timestamp', timestamp) >= one_day_ago]
                features['transactions_last_day'] = len(recent_day)
                features['total_spent_last_day'] = sum(float(h.get('amount', 0)) for h in recent_day)
            else:
                features['transactions_last_day'] = 0
                features['total_spent_last_day'] = 0
            
            # Statistical features
            amounts = [float(h.get('amount', 0)) for h in history]
            features['avg_transaction_amount'] = np.mean(amounts) if amounts else 0
            features['amount_deviation'] = (
                abs(features['amount'] - features['avg_transaction_amount']) / 
                (np.std(amounts) + 1e-6)
            ) if amounts else 0
            
            # Category match rate
            tx_category = transaction_data.get('category', '')
            if tx_category and history:
                matching = sum(1 for h in history if h.get('category') == tx_category)
                features['category_match_rate'] = matching / len(history)
            else:
                features['category_match_rate'] = 1.0
            
            # Time since last transaction
            if history and timestamp:
                last_tx_time = max(h.get('timestamp', timestamp) for h in history)
                features['time_since_last_transaction'] = (timestamp - last_tx_time).total_seconds() / 3600
            else:
                features['time_since_last_transaction'] = 24
        else:
            # No history - use defaults
            features['transactions_last_hour'] = 0
            features['transactions_last_day'] = 0
            features['total_spent_last_day'] = 0
            features['avg_transaction_amount'] = features['amount']
            features['amount_deviation'] = 0
            features['category_match_rate'] = 1.0
            features['time_since_last_transaction'] = 24
        
        # Convert to feature vector
        feature_vector = np.array([features.get(name, 0) for name in self.feature_names])
        return feature_vector.reshape(1, -1)
    
    def train(self, transactions: List[Dict]) -> None:
        """
        Train the fraud detection model on historical transactions.
        
        Args:
            transactions: List of historical transaction dictionaries
        """
        if len(transactions) < 10:
            logger.warning("Insufficient data for training. Need at least 10 transactions.")
            return
        
        logger.info(f"Training fraud detection model on {len(transactions)} transactions...")
        
        # Group by beneficiary for history
        beneficiary_history: Dict[str, List[Dict]] = {}
        for tx in transactions:
            ben_id = tx.get('beneficiary_id', 'unknown')
            if ben_id not in beneficiary_history:
                beneficiary_history[ben_id] = []
            beneficiary_history[ben_id].append(tx)
        
        # Extract features for all transactions
        feature_matrix = []
        for tx in transactions:
            ben_id = tx.get('beneficiary_id', 'unknown')
            history = [h for h in beneficiary_history.get(ben_id, []) 
                      if h.get('timestamp', 0) < tx.get('timestamp', float('inf'))]
            features = self.extract_features(tx, history)
            feature_matrix.append(features.flatten())
        
        X = np.array(feature_matrix)
        
        # Scale features
        X_scaled = self.scaler.fit_transform(X)
        
        # Train Isolation Forest
        self.model = IsolationForest(
            contamination=self.contamination,
            random_state=42,
            n_estimators=100
        )
        self.model.fit(X_scaled)
        self.is_fitted = True
        
        logger.info("Fraud detection model trained successfully")
        
        # Save model
        self.save_model()
    
    def predict(self, transaction_data: Dict, history: List[Dict]) -> Tuple[bool, float, List[str]]:
        """
        Predict if a transaction is anomalous.
        
        Args:
            transaction_data: Transaction to evaluate
            history: Beneficiary's transaction history
            
        Returns:
            Tuple of (is_anomaly, fraud_score, reasons)
        """
        if not self.is_fitted:
            # Try to load saved model
            if not self.load_model():
                # Use rule-based detection as fallback
                return self._rule_based_detection(transaction_data, history)
        
        # Extract features
        features = self.extract_features(transaction_data, history)
        features_scaled = self.scaler.transform(features)
        
        # Predict
        prediction = self.model.predict(features_scaled)[0]
        score = -self.model.score_samples(features_scaled)[0]  # Convert to positive score
        
        is_anomaly = prediction == -1
        fraud_score = min(max(score / 2, 0), 1)  # Normalize to 0-1
        
        # Generate reasons
        reasons = self._generate_reasons(transaction_data, history, features.flatten())
        
        return is_anomaly, fraud_score, reasons
    
    def _rule_based_detection(self, transaction_data: Dict, history: List[Dict]) -> Tuple[bool, float, List[str]]:
        """
        Fallback rule-based anomaly detection when ML model is not available.
        """
        reasons = []
        fraud_score = 0.0
        
        amount = float(transaction_data.get('amount', 0))
        
        # Rule 1: Unusually large transaction
        if history:
            avg_amount = np.mean([float(h.get('amount', 0)) for h in history])
            if amount > avg_amount * 3:
                reasons.append(f"Transaction amount ({amount}) is 3x higher than average ({avg_amount:.2f})")
                fraud_score += 0.3
        
        # Rule 2: Rapid spending
        timestamp = transaction_data.get('timestamp')
        if timestamp and history:
            one_hour_ago = timestamp - timedelta(hours=1)
            recent = [h for h in history if h.get('timestamp', timestamp) >= one_hour_ago]
            if len(recent) > 5:
                reasons.append(f"High transaction frequency: {len(recent)} transactions in the last hour")
                fraud_score += 0.3
        
        # Rule 3: High daily spending
        if timestamp and history:
            one_day_ago = timestamp - timedelta(days=1)
            daily = [h for h in history if h.get('timestamp', timestamp) >= one_day_ago]
            daily_total = sum(float(h.get('amount', 0)) for h in daily) + amount
            if daily_total > 500:  # Assuming 500 drUSD daily limit
                reasons.append(f"High daily spending: {daily_total:.2f} drUSD")
                fraud_score += 0.2
        
        # Rule 4: Unusual time
        if timestamp:
            hour = timestamp.hour
            if hour < 6 or hour > 23:
                reasons.append(f"Unusual transaction time: {hour}:00")
                fraud_score += 0.1
        
        fraud_score = min(fraud_score, 1.0)
        is_anomaly = fraud_score > 0.5
        
        return is_anomaly, fraud_score, reasons
    
    def _generate_reasons(self, transaction_data: Dict, history: List[Dict], features: np.ndarray) -> List[str]:
        """Generate human-readable reasons for flagging."""
        reasons = []
        
        # Check individual features against thresholds
        if features[0] > 200:  # High amount
            reasons.append(f"High transaction amount: {features[0]:.2f} drUSD")
        
        if features[3] > 5:  # Many recent transactions
            reasons.append(f"High transaction frequency: {int(features[3])} in last hour")
        
        if features[7] > 2:  # High deviation from average
            reasons.append("Transaction amount significantly deviates from average")
        
        if features[8] < 0.5:  # Low category match
            reasons.append("Unusual spending category for this beneficiary")
        
        if features[9] < 0.1:  # Very short time since last transaction
            reasons.append("Rapid successive transactions detected")
        
        return reasons if reasons else ["Anomalous pattern detected by ML model"]
    
    def save_model(self, path: Optional[str] = None) -> None:
        """Save the trained model to disk."""
        if not self.is_fitted:
            return
        
        path = path or (MODEL_DIR / 'fraud_detector.joblib')
        joblib.dump({
            'model': self.model,
            'scaler': self.scaler,
            'feature_names': self.feature_names
        }, path)
        logger.info(f"Model saved to {path}")
    
    def load_model(self, path: Optional[str] = None) -> bool:
        """Load a trained model from disk."""
        path = path or (MODEL_DIR / 'fraud_detector.joblib')
        
        try:
            data = joblib.load(path)
            self.model = data['model']
            self.scaler = data['scaler']
            self.feature_names = data['feature_names']
            self.is_fitted = True
            logger.info(f"Model loaded from {path}")
            return True
        except Exception as e:
            logger.warning(f"Could not load model: {e}")
            return False


class BeneficiaryRiskScorer:
    """
    Risk scoring for beneficiaries based on behavior analysis.
    """
    
    def __init__(self):
        self.weights = {
            'spending_compliance': 0.3,
            'category_adherence': 0.2,
            'transaction_frequency': 0.15,
            'amount_consistency': 0.15,
            'verification_status': 0.2
        }
    
    def calculate_risk_score(self, beneficiary_data: Dict, transactions: List[Dict]) -> Tuple[float, Dict]:
        """
        Calculate a risk score for a beneficiary.
        
        Args:
            beneficiary_data: Beneficiary profile information
            transactions: Beneficiary's transaction history
            
        Returns:
            Tuple of (risk_score, risk_factors)
        """
        risk_factors = {}
        
        # Spending compliance (are they within allowances?)
        if transactions:
            total_spent = sum(float(t.get('amount', 0)) for t in transactions)
            total_allowance = float(beneficiary_data.get('total_allowance', total_spent))
            if total_allowance > 0:
                compliance_ratio = min(total_spent / total_allowance, 1.0)
                risk_factors['spending_compliance'] = 1 - compliance_ratio  # Lower is better
            else:
                risk_factors['spending_compliance'] = 0
        else:
            risk_factors['spending_compliance'] = 0
        
        # Category adherence
        if transactions:
            flagged = sum(1 for t in transactions if t.get('is_flagged', False))
            risk_factors['category_adherence'] = flagged / len(transactions)
        else:
            risk_factors['category_adherence'] = 0
        
        # Transaction frequency anomaly
        if len(transactions) > 1:
            # Check for irregular patterns
            amounts = [float(t.get('amount', 0)) for t in transactions]
            cv = np.std(amounts) / (np.mean(amounts) + 1e-6)  # Coefficient of variation
            risk_factors['transaction_frequency'] = min(cv, 1.0)
        else:
            risk_factors['transaction_frequency'] = 0
        
        # Amount consistency
        if transactions:
            amounts = [float(t.get('amount', 0)) for t in transactions]
            if len(amounts) > 1:
                deviation = np.std(amounts) / (np.mean(amounts) + 1e-6)
                risk_factors['amount_consistency'] = min(deviation / 2, 1.0)
            else:
                risk_factors['amount_consistency'] = 0
        else:
            risk_factors['amount_consistency'] = 0
        
        # Verification status
        verification_status = beneficiary_data.get('verification_status', 'pending')
        if verification_status == 'verified':
            risk_factors['verification_status'] = 0
        elif verification_status == 'pending':
            risk_factors['verification_status'] = 0.5
        else:
            risk_factors['verification_status'] = 1.0
        
        # Calculate weighted score
        risk_score = sum(
            risk_factors.get(factor, 0) * weight
            for factor, weight in self.weights.items()
        )
        
        return risk_score, risk_factors


# Global instances
fraud_detector = FraudDetector()
risk_scorer = BeneficiaryRiskScorer()
