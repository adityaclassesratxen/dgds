"""
FastAPI dependencies for authentication, tenant filtering, and translations
"""

from fastapi import Header, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import Optional, Callable
import re
from translations import get_translation

def get_language(
    accept_language: str = Header(None, description="Language preference (e.g., 'en', 'hi', 'sa')")
) -> str:
    """
    Extract language from Accept-Language header
    Supports 'en', 'hi', 'sa' with fallback to 'en'
    """
    if not accept_language:
        return "en"
    
    # Parse Accept-Language header
    # Format: "en-US,en;q=0.9,hi;q=0.8,sa;q=0.7"
    languages = accept_language.split(',')
    
    # Extract language codes (e.g., 'en-US' -> 'en')
    for lang in languages:
        lang_code = lang.split(';')[0].strip().lower()
        # Extract primary language (e.g., 'en-us' -> 'en')
        primary_lang = lang_code.split('-')[0]
        
        # Check if we support this language
        if primary_lang in ['en', 'hi', 'sa']:
            return primary_lang
    
    # Fallback to English
    return "en"

def get_translator(lang: str = Depends(get_language)) -> Callable[[str, dict], str]:
    """
    Return a translator function for the given language
    Usage: translator = get_translator()
           message = translator('auth.invalid_credentials')
    """
    def translate(key: str, **kwargs):
        return get_translation(lang, key, **kwargs)
    
    return translate

# Common error messages with translation support
def create_error_response(
    translator: Callable[[str, dict], str],
    key: str,
    status_code: int = 400,
    **kwargs
) -> HTTPException:
    """
    Create an HTTPException with translated message
    """
    message = translator(key, **kwargs)
    return HTTPException(status_code=status_code, detail=message)

def create_success_response(
    translator: Callable[[str, dict], str],
    key: str,
    data: dict = None,
    **kwargs
) -> dict:
    """
    Create a success response with translated message
    """
    message = translator(key, **kwargs)
    response = {"message": message, "success": True}
    if data:
        response["data"] = data
    return response
