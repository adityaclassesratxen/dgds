"""
Tenant filtering utilities for multi-tenant data isolation
"""
from typing import Optional
from fastapi import Depends, HTTPException, Header
from sqlalchemy.orm import Session
from auth import get_current_user
from models import User, UserRole


async def get_tenant_filter(
    current_user: User = Depends(get_current_user),
    x_tenant_id: Optional[str] = Header(None, alias="X-Tenant-Id"),
) -> Optional[int]:
    """
    Get tenant_id for filtering queries based on current user.
    Super Admin and Admin can override via X-Tenant-Id header to work within a specific tenant.
    Returns None when Super Admin or Admin has no header set (sees all data).
    For other roles, uses X-Tenant-Id header or their assigned tenant_id.
    """
    # Super Admin and Admin can switch tenant context via header or see all data
    if current_user.role in [UserRole.SUPER_ADMIN, UserRole.ADMIN]:
        if x_tenant_id:
            try:
                return int(x_tenant_id)
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid X-Tenant-Id header")
        # No header means see all data (return None to skip tenant filtering)
        return None
    
    # For other roles, use X-Tenant-Id header if provided (for tenant switching)
    if x_tenant_id:
        try:
            return int(x_tenant_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid X-Tenant-Id header")
    
    # Fall back to user's assigned tenant_id
    if current_user.tenant_id:
        return current_user.tenant_id
    
    # If user has no tenant_id and no header, they can't access tenant-specific data
    raise HTTPException(
        status_code=403,
        detail="User is not assigned to any tenant. Please select a tenant from the dropdown."
    )


def apply_tenant_filter(query, model, tenant_id: Optional[int]):
    """
    Apply tenant filter to a query
    If tenant_id is None (Super Admin), no filter is applied
    Otherwise, filters by tenant_id
    """
    if tenant_id is not None:
        return query.filter(model.tenant_id == tenant_id)
    return query


async def check_tenant_access(
    resource_tenant_id: int,
    current_user: User = Depends(get_current_user)
):
    """
    Check if current user can access a resource from a specific tenant
    Super Admin can access all resources
    Other users can only access resources from their own tenant
    """
    # Super Admin can access all resources
    if current_user.role == UserRole.SUPER_ADMIN:
        return True
    
    # Check if user's tenant matches the resource's tenant
    if current_user.tenant_id == resource_tenant_id:
        return True
    
    raise HTTPException(
        status_code=403,
        detail="Access denied: Cannot access resource from different tenant"
    )
