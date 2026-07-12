"""
Afritide - Cart Routes
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
import uuid

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.responses import success_response
from app.models.cart import Cart, CartItem
from app.models.product import Product, ProductStatus
from pydantic import BaseModel

router = APIRouter()


class CartItemAdd(BaseModel):
    product_id: uuid.UUID
    quantity:   float = 1.0


class CartItemUpdate(BaseModel):
    quantity: float


def get_or_create_cart(user_id: uuid.UUID, db: Session) -> Cart:
    cart = db.query(Cart).filter(Cart.user_id == user_id).first()
    if not cart:
        cart = Cart(user_id=user_id)
        db.add(cart)
        db.commit()
        db.refresh(cart)
    return cart


def serialize_cart(cart: Cart, db: Session) -> dict:
    items = []
    subtotal = 0.0

    for item in cart.items:
        product = db.query(Product).filter(Product.id == item.product_id).first()
        if not product:
            continue
        item_total = product.price * item.quantity
        subtotal += item_total
        items.append({
            "id":          str(item.id),
            "product_id":  str(product.id),
            "title":       product.title,
            "main_image":  product.main_image,
            "price":       product.price,
            "currency":    product.currency,
            "unit":        product.unit,
            "quantity":    item.quantity,
            "item_total":  item_total,
            "seller_id":   str(product.seller_id),
            "min_order":   product.minimum_order_quantity,
            "max_order":   product.quantity_available,
            "country":     product.country,
            "is_organic":  product.is_organic,
        })

    return {
        "id":        str(cart.id),
        "items":     items,
        "subtotal":  subtotal,
        "item_count": len(items),
    }


@router.get("", summary="Get current user's cart")
async def get_cart(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    cart = get_or_create_cart(current_user.id, db)
    return success_response(data=serialize_cart(cart, db))


@router.post("/items", summary="Add item to cart")
async def add_to_cart(
    payload:      CartItemAdd,
    current_user= Depends(get_current_user),
    db:           Session = Depends(get_db),
):
    product = db.query(Product).filter(
        Product.id == payload.product_id,
        Product.status == ProductStatus.ACTIVE,
    ).first()

    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    if payload.quantity < product.minimum_order_quantity:
        raise HTTPException(
            status_code=400,
            detail=f"Minimum order quantity is {product.minimum_order_quantity} {product.unit}"
        )

    if payload.quantity > product.quantity_available:
        raise HTTPException(
            status_code=400,
            detail=f"Only {product.quantity_available} {product.unit} available"
        )

    # Can't buy your own product
    if product.seller_id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot buy your own product")

    cart = get_or_create_cart(current_user.id, db)

    # Check if item already in cart
    existing = db.query(CartItem).filter(
        CartItem.cart_id == cart.id,
        CartItem.product_id == payload.product_id,
    ).first()

    if existing:
        existing.quantity += payload.quantity
        db.commit()
        db.refresh(existing)
    else:
        item = CartItem(
            cart_id=cart.id,
            product_id=payload.product_id,
            quantity=payload.quantity,
        )
        db.add(item)
        db.commit()

    return success_response(
        data=serialize_cart(cart, db),
        message="Item added to cart",
    )


@router.put("/items/{item_id}", summary="Update cart item quantity")
async def update_cart_item(
    item_id:      uuid.UUID,
    payload:      CartItemUpdate,
    current_user= Depends(get_current_user),
    db:           Session = Depends(get_db),
):
    cart = get_or_create_cart(current_user.id, db)
    item = db.query(CartItem).filter(
        CartItem.id == item_id,
        CartItem.cart_id == cart.id,
    ).first()

    if not item:
        raise HTTPException(status_code=404, detail="Item not found in cart")

    product = db.query(Product).filter(Product.id == item.product_id).first()
    if payload.quantity < product.minimum_order_quantity:
        raise HTTPException(
            status_code=400,
            detail=f"Minimum order quantity is {product.minimum_order_quantity} {product.unit}"
        )

    item.quantity = payload.quantity
    db.commit()

    return success_response(
        data=serialize_cart(cart, db),
        message="Cart updated",
    )


@router.delete("/items/{item_id}", summary="Remove item from cart")
async def remove_from_cart(
    item_id:      uuid.UUID,
    current_user= Depends(get_current_user),
    db:           Session = Depends(get_db),
):
    cart = get_or_create_cart(current_user.id, db)
    item = db.query(CartItem).filter(
        CartItem.id == item_id,
        CartItem.cart_id == cart.id,
    ).first()

    if not item:
        raise HTTPException(status_code=404, detail="Item not found in cart")

    db.delete(item)
    db.commit()

    return success_response(
        data=serialize_cart(cart, db),
        message="Item removed from cart",
    )


@router.delete("", summary="Clear entire cart")
async def clear_cart(
    current_user= Depends(get_current_user),
    db:           Session = Depends(get_db),
):
    cart = get_or_create_cart(current_user.id, db)
    db.query(CartItem).filter(CartItem.cart_id == cart.id).delete()
    db.commit()

    return success_response(message="Cart cleared")