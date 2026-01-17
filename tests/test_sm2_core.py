import pytest
from app.api.routers.review import calculate_sm2

class TestSM2Algorithm:
    """
    Comprehensive tests for the SM-2 Spaced Repetition Algorithm.
    
    Reference: https://github.com/open-spaced-repetition/sm-2
    
    Key rules (matching original SM-2 paper):
    1. EF is ONLY updated on successful reviews (Q >= 3)
    2. On failure (Q < 3): EF stays UNCHANGED, repetition resets to 0, interval = 1
    3. Interval progression: 1 day -> 6 days -> (interval * EF)
    4. EF formula: EF' = EF + (0.1 - (5 - Q) * (0.08 + (5 - Q) * 0.02))
    5. Minimum EF = 1.3
    """

    def test_first_successful_review(self):
        """First review (repetition 0 -> 1) always sets interval to 1 day."""
        initial_ef = 2.5
        initial_interval = 1.0
        repetition = 0
        quality = 3  # Remembered

        result = calculate_sm2(quality, initial_ef, initial_interval, repetition)
        
        assert result["new_repetition"] == 1
        assert result["new_interval"] == 1.0
        # Check EF calculation
        # EF' = 2.5 + (0.1 - (2) * (0.08 + 2 * 0.02))
        # EF' = 2.5 + (0.1 - 2 * 0.12) = 2.5 + (0.1 - 0.24) = 2.5 - 0.14 = 2.36
        assert result["new_ef"] == 2.36

    def test_second_successful_review(self):
        """Second review (repetition 1 -> 2) always sets interval to 6 days."""
        initial_ef = 2.36
        initial_interval = 1.0
        repetition = 1
        quality = 4  # Good (Not standard in our app, but algo handles it? Our app uses 3 and 5)
        # Our app supports inputs 1, 2, 3, 5. 
        # But calculate_sm2 accepts int. Let's test with 3.
        quality = 3
        
        result = calculate_sm2(quality, initial_ef, initial_interval, repetition)
        
        assert result["new_repetition"] == 2
        assert result["new_interval"] == 6.0
        # EF' = 2.36 + (0.1 - 2 * 0.12) = 2.36 - 0.14 = 2.22
        assert result["new_ef"] == 2.22

    def test_third_successful_review(self):
        """Third review (repetition 2 -> 3) uses I * EF."""
        initial_ef = 2.5
        initial_interval = 6.0
        repetition = 2
        quality = 5  # Easy
        
        # EF' = 2.5 + (0.1 - (0) * ...) = 2.6
        # Interval = 6.0 * 2.6 = 15.6
        
        result = calculate_sm2(quality, initial_ef, initial_interval, repetition)
        
        assert result["new_repetition"] == 3
        assert result["new_ef"] == 2.6
        assert result["new_interval"] == 15.6

    def test_fail_review_resets_progress(self):
        """Failing (Quality < 3) resets interval to 1, repetition to 0, but EF stays UNCHANGED."""
        initial_ef = 2.5
        initial_interval = 15.6
        repetition = 3
        quality = 1  # Forgot
        
        result = calculate_sm2(quality, initial_ef, initial_interval, repetition)
        
        assert result["new_repetition"] == 0
        assert result["new_interval"] == 1.0
        # Per original SM-2 paper: EF does NOT change on incorrect responses
        assert result["new_ef"] == initial_ef

    def test_ef_minimum_limit_on_success(self):
        """EF should never drop below 1.3 (on successful review)."""
        initial_ef = 1.35  # Close to minimum
        initial_interval = 10.0
        repetition = 5
        quality = 3  # Quality 3 decreases EF by 0.14
        
        # Calculation without min:
        # EF' = 1.35 + (0.1 - 2 * 0.12) = 1.35 - 0.14 = 1.21
        # Should be clamped to 1.3
        
        result = calculate_sm2(quality, initial_ef, initial_interval, repetition)
        
        assert result["new_ef"] == 1.3

    def test_ef_unchanged_on_failure(self):
        """EF should stay unchanged on failure (per original SM-2 paper)."""
        initial_ef = 2.0
        initial_interval = 10.0
        repetition = 5
        quality = 1  # Failed
        
        result = calculate_sm2(quality, initial_ef, initial_interval, repetition)
        
        # EF unchanged on failure
        assert result["new_ef"] == initial_ef
        assert result["new_repetition"] == 0
        assert result["new_interval"] == 1.0

    def test_easy_review_boosts_ef(self):
        """Quality 5 boosts EF."""
        initial_ef = 2.5
        initial_interval = 6.0
        repetition = 2
        quality = 5
        
        result = calculate_sm2(quality, initial_ef, initial_interval, repetition)
        
        # EF' = 2.5 + 0.1 = 2.6
        assert result["new_ef"] == 2.6
        assert result["new_interval"] == 15.6

    def test_rounding_precision(self):
        """Verify output is rounded correctly."""
        # Just checking it returns rounded floats as expected by signature
        res = calculate_sm2(3, 2.5, 1.0, 0)
        assert isinstance(res["new_ef"], float)
        assert isinstance(res["new_interval"], float)
