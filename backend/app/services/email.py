"""
Afritide - Email Service
Folder: backend/app/services/email.py
"""

import logging

try:
    import resend
    RESEND_AVAILABLE = True
except ImportError:
    RESEND_AVAILABLE = False

from app.core.config import settings

logger = logging.getLogger(__name__)


def _send_email(to_email: str, subject: str, html_body: str) -> bool:
    """Send email via Resend API."""
    if not settings.RESEND_API_KEY:
        logger.warning(f"[EMAIL SKIPPED - no RESEND_API_KEY] To: {to_email} | Subject: {subject}")
        return False

    if not RESEND_AVAILABLE:
        logger.error("Resend package not installed. Run: pip install resend")
        return False

    try:
        resend.api_key = settings.RESEND_API_KEY
        resend.Emails.send({
            "from": f"{settings.EMAIL_FROM_NAME} <noreply@afritidegroup.com>",
            "to":      to_email,
            "subject": subject,
            "html":    html_body,
        })
        logger.info(f"Email sent to {to_email}: {subject}")
        return True
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {e}")
        return False


def _email_wrapper(content_html: str) -> str:
    return f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f5f5f5; padding: 30px;">
        <div style="background: #2E7D32; padding: 24px; border-radius: 8px 8px 0 0; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">🌍 Afritide</h1>
            <p style="color: #C8E6C9; margin: 4px 0 0; font-size: 13px;">Connecting African Farmers to the World</p>
        </div>
        <div style="background: #ffffff; padding: 32px; border-radius: 0 0 8px 8px;">
            {content_html}
        </div>
        <p style="text-align: center; color: #999; font-size: 12px; margin-top: 20px;">
            &copy; 2026 Afritide Agriculture Marketplace. All rights reserved.
        </p>
    </div>
    """


def send_otp_email(to_email: str, first_name: str, otp: str):
    content = f"""
        <h2 style="color: #1A1A1A;">Verify your email, {first_name}</h2>
        <p style="color: #555; font-size: 15px;">Use the code below to verify your Afritide account. It expires in 15 minutes.</p>
        <div style="background: #E8F5E9; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #2E7D32;">{otp}</span>
        </div>
        <p style="color: #888; font-size: 13px;">If you did not request this, you can safely ignore this email.</p>
    """
    _send_email(to_email, "Verify your Afritide account", _email_wrapper(content))


def send_welcome_email(to_email: str, first_name: str, role: str):
    content = f"""
        <h2 style="color: #1A1A1A;">Welcome to Afritide, {first_name}! 🎉</h2>
        <p style="color: #555; font-size: 15px;">
            Your account has been verified and you're now part of Africa's leading agricultural marketplace,
            registered as a <strong>{role.replace('_', ' ').title()}</strong>.
        </p>
        <p style="color: #555; font-size: 15px;">You can now browse products, connect with verified farmers and buyers, and start trading.</p>
        <div style="text-align: center; margin: 28px 0;">
            <a href="https://www.afritidegroup.com/dashboard"
               style="background: #2E7D32; color: #fff; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: bold;">
               Go to Dashboard
            </a>
        </div>
    """
    _send_email(to_email, "Welcome to Afritide!", _email_wrapper(content))


def send_password_reset_email(to_email: str, first_name: str, token: str):
    reset_url = f"https://www.afritidegroup.com/reset-password?token={token}"
    content = f"""
        <h2 style="color: #1A1A1A;">Reset your password, {first_name}</h2>
        <p style="color: #555; font-size: 15px;">We received a request to reset your password. This link expires in 1 hour.</p>
        <div style="text-align: center; margin: 28px 0;">
            <a href="{reset_url}"
               style="background: #2E7D32; color: #fff; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: bold;">
               Reset Password
            </a>
        </div>
        <p style="color: #888; font-size: 13px;">If you did not request this, you can safely ignore this email.</p>
    """
    _send_email(to_email, "Reset your Afritide password", _email_wrapper(content))


def send_order_notification_email(to_email: str, first_name: str, order_number: str, status: str):
    content = f"""
        <h2 style="color: #1A1A1A;">Order Update</h2>
        <p style="color: #555; font-size: 15px;">Hi {first_name}, your order <strong>{order_number}</strong> status has changed to:</p>
        <div style="background: #E8F5E9; padding: 16px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <span style="font-size: 18px; font-weight: bold; color: #2E7D32;">{status.upper()}</span>
        </div>
    """
    _send_email(to_email, f"Order {order_number} - {status.title()}", _email_wrapper(content))


def send_order_confirmation_email(
    to_email:     str,
    first_name:   str,
    order_number: str,
    amount:       float,
    currency:     str,
):
    content = f"""
        <h2 style="color: #1A1A1A;">✅ Order Confirmed!</h2>
        <p style="color: #555; font-size: 15px;">Hi {first_name}, your payment was successful and your order has been confirmed.</p>
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="color: #555; margin: 0 0 8px;"><strong>Order Number:</strong> {order_number}</p>
            <p style="color: #2E7D32; font-size: 22px; font-weight: bold; margin: 0;">
                {currency} {amount:,.2f}
            </p>
        </div>
        <p style="color: #555; font-size: 15px;">
            Your seller has been notified and will process your order shortly.
        </p>
        <div style="text-align: center; margin-top: 24px;">
            <a href="https://www.afritidegroup.com/dashboard/buyer/orders"
               style="background: #2E7D32; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">
               Track My Order
            </a>
        </div>
    """
    _send_email(to_email, f"Order Confirmed — {order_number}", _email_wrapper(content))


def send_price_alert_email(
    to_email:          str,
    first_name:        str,
    commodity_name:    str,
    old_price:         float,
    new_price:         float,
    currency:          str,
    change_percentage: float,
):
    direction = "increased" if new_price > old_price else "decreased"
    color     = "#2E7D32" if new_price > old_price else "#c62828"
    arrow     = "📈" if new_price > old_price else "📉"
    pct       = abs(change_percentage)

    content = f"""
        <h2 style="color: #1A1A1A;">{arrow} Price Alert: {commodity_name}</h2>
        <p style="color: #555; font-size: 15px;">
            Hi {first_name}, the price of <strong>{commodity_name}</strong> has {direction}.
        </p>
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td style="padding: 8px 0; color: #555; font-size: 14px;">Previous Price:</td>
                    <td style="padding: 8px 0; color: #555; font-size: 14px; font-weight: bold; text-align: right;">
                        {currency} {old_price:,.2f}
                    </td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; color: #555; font-size: 14px;">New Price:</td>
                    <td style="padding: 8px 0; font-size: 20px; font-weight: bold; color: {color}; text-align: right;">
                        {currency} {new_price:,.2f}
                    </td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; color: #555; font-size: 14px;">Change:</td>
                    <td style="padding: 8px 0; font-size: 14px; font-weight: bold; color: {color}; text-align: right;">
                        {arrow} {pct:.1f}%
                    </td>
                </tr>
            </table>
        </div>
        <div style="text-align: center; margin-top: 20px;">
            <a href="https://www.afritidegroup.com/commodities"
               style="background: #2E7D32; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">
               View Price Board
            </a>
        </div>
        <p style="color: #888; font-size: 12px; margin-top: 16px; text-align: center;">
            To stop receiving alerts, visit your dashboard and manage your price alerts.
        </p>
    """
    _send_email(
        to_email,
        f"Price Alert: {commodity_name} {direction} {pct:.1f}%",
        _email_wrapper(content)
    )


def send_kyc_status_email(to_email: str, first_name: str, approved: bool, reason: str = None):
    if approved:
        content = f"""
            <h2 style="color: #1A1A1A;">Verification Approved ✅</h2>
            <p style="color: #555; font-size: 15px;">
                Hi {first_name}, your KYC documents have been verified.
                You now have a verified badge on your profile.
            </p>
            <div style="text-align: center; margin-top: 24px;">
                <a href="https://www.afritidegroup.com/dashboard"
                   style="background: #2E7D32; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">
                   Go to Dashboard
                </a>
            </div>
        """
    else:
        content = f"""
            <h2 style="color: #1A1A1A;">Verification Update</h2>
            <p style="color: #555; font-size: 15px;">Hi {first_name}, your KYC submission needs attention.</p>
            <div style="background: #fdecea; padding: 16px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #c62828;">
                <p style="color: #c62828; font-size: 14px; margin: 0;">
                    Reason: {reason or 'Documents did not meet requirements'}
                </p>
            </div>
            <div style="text-align: center; margin-top: 24px;">
                <a href="https://www.afritidegroup.com/dashboard"
                   style="background: #2E7D32; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">
                   Resubmit Documents
                </a>
            </div>
        """
    _send_email(to_email, "Afritide Verification Update", _email_wrapper(content))


def send_support_notification(name: str, email: str, topic: str, message: str, ticket_id: str):
    content = f"""
        <h2 style="color: #1A1A1A;">New Support Ticket #{ticket_id[:8].upper()}</h2>
        <table style="width: 100%; border-collapse: collapse;">
            <tr>
                <td style="padding: 8px; color: #555; font-size: 14px;"><strong>From:</strong></td>
                <td style="padding: 8px; color: #333; font-size: 14px;">{name}</td>
            </tr>
            <tr>
                <td style="padding: 8px; color: #555; font-size: 14px;"><strong>Email:</strong></td>
                <td style="padding: 8px; color: #333; font-size: 14px;">{email}</td>
            </tr>
            <tr>
                <td style="padding: 8px; color: #555; font-size: 14px;"><strong>Topic:</strong></td>
                <td style="padding: 8px; color: #333; font-size: 14px;">{topic}</td>
            </tr>
        </table>
        <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin-top: 16px;">
            <p style="color: #333; font-size: 14px; margin: 0;">{message}</p>
        </div>
        <div style="text-align: center; margin-top: 20px;">
            <a href="https://www.afritidegroup.com/dashboard/admin/support"
               style="background: #2E7D32; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">
               View in Admin Dashboard
            </a>
        </div>
    """
    _send_email(
        "afritidegroup@gmail.com",
        f"[Support] {topic} — {name}",
        _email_wrapper(content)
    )


def send_support_reply(to_email: str, name: str, topic: str, reply: str):
    content = f"""
        <h2 style="color: #1A1A1A;">Response to your support request</h2>
        <p style="color: #555; font-size: 15px;">
            Hi {name}, we've responded to your request regarding: <strong>{topic}</strong>
        </p>
        <div style="background: #E8F5E9; padding: 16px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2E7D32;">
            <p style="color: #1A1A1A; font-size: 14px; margin: 0; line-height: 1.6;">{reply}</p>
        </div>
        <p style="color: #888; font-size: 13px;">If you need further assistance, please visit our support page.</p>
        <div style="text-align: center; margin-top: 20px;">
            <a href="https://www.afritidegroup.com/support"
               style="background: #2E7D32; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">
               Visit Support Center
            </a>
        </div>
    """
    _send_email(to_email, f"Re: {topic} — Afritide Support", _email_wrapper(content))

def send_new_order_email(
    to_email:     str,
    first_name:   str,
    order_number: str,
    amount:       float,
    currency:     str,
    item_count:   int,
    buyer_name:   str,
):
    content = f"""
        <h2 style="color: #1A1A1A;">🛒 New Order Received!</h2>
        <p style="color: #555; font-size: 15px;">
            Hi {first_name}, you have received a new order from <strong>{buyer_name}</strong>.
        </p>
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="color: #555; margin: 0 0 8px;"><strong>Order Number:</strong> {order_number}</p>
            <p style="color: #555; margin: 0 0 8px;"><strong>Items:</strong> {item_count} item(s)</p>
            <p style="color: #2E7D32; font-size: 22px; font-weight: bold; margin: 0;">
                {currency} {amount:,.2f}
            </p>
        </div>
        <p style="color: #555; font-size: 15px;">
            Please log in to your dashboard to confirm this order and begin fulfillment.
        </p>
        <div style="text-align: center; margin-top: 24px;">
            <a href="https://www.afritidegroup.com/dashboard/farmer/orders"
               style="background: #2E7D32; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">
               View Order
            </a>
        </div>
    """
    _send_email(to_email, f"New Order Received — {order_number}", _email_wrapper(content))


def send_order_status_email(
    to_email:        str,
    first_name:      str,
    order_number:    str,
    new_status:      str,
    tracking_number: str = None,
):
    status_messages = {
        "confirmed":  ("✅ Order Confirmed",   "Your order has been confirmed by the seller and is being prepared."),
        "shipped":    ("🚚 Order Shipped",      "Your order is on its way!"),
        "delivered":  ("📦 Order Delivered",   "Your order has been delivered. We hope you love it!"),
        "completed":  ("🎉 Order Completed",   "Your order is complete. Thank you for shopping on Afritide!"),
        "cancelled":  ("❌ Order Cancelled",   "Unfortunately your order has been cancelled."),
    }

    title, message = status_messages.get(new_status, ("Order Update", f"Your order status has changed to {new_status}."))
    color = "#c62828" if new_status == "cancelled" else "#2E7D32"

    tracking_html = ""
    if tracking_number and new_status == "shipped":
        tracking_html = f"""
        <div style="background: #E3F2FD; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #1565C0;">
            <p style="color: #1565C0; font-size: 14px; margin: 0; font-weight: bold;">
                🔍 Tracking Number: {tracking_number}
            </p>
        </div>
        """

    content = f"""
        <h2 style="color: #1A1A1A;">{title}</h2>
        <p style="color: #555; font-size: 15px;">Hi {first_name}, {message}</p>
        <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 20px 0;">
            <p style="color: #555; margin: 0 0 4px; font-size: 14px;"><strong>Order:</strong> {order_number}</p>
            <p style="color: {color}; font-size: 18px; font-weight: bold; margin: 0; text-transform: capitalize;">{new_status}</p>
        </div>
        {tracking_html}
        <div style="text-align: center; margin-top: 24px;">
            <a href="https://www.afritidegroup.com/dashboard/buyer/orders"
               style="background: #2E7D32; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">
               Track My Order
            </a>
        </div>
    """
    _send_email(to_email, f"{title} — {order_number}", _email_wrapper(content))