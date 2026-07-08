"""
Afritide - Email Service
Folder: backend/app/services/email.py
"""

import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import logging

from app.core.config import settings

logger = logging.getLogger(__name__)


def _send_email(to_email: str, subject: str, html_body: str) -> bool:
    """Core SMTP send function. Logs and fails silently in dev if SMTP not configured."""
    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        logger.warning(f"[EMAIL SKIPPED - no SMTP configured] To: {to_email} | Subject: {subject}")
        return False

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{settings.EMAIL_FROM_NAME} <{settings.EMAIL_FROM}>"
        msg["To"] = to_email
        msg.attach(MIMEText(html_body, "html"))

        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(settings.EMAIL_FROM, to_email, msg.as_string())

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
            <a href="https://afritide.com/dashboard" style="background: #2E7D32; color: #fff; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: bold;">Go to Dashboard</a>
        </div>
    """
    _send_email(to_email, "Welcome to Afritide!", _email_wrapper(content))


def send_password_reset_email(to_email: str, first_name: str, token: str):
    reset_url = f"https://afritidegroup.com/reset-password?token={token}"
    content = f"""
        <h2 style="color: #1A1A1A;">Reset your password, {first_name}</h2>
        <p style="color: #555; font-size: 15px;">We received a request to reset your password. This link expires in 1 hour.</p>
        <div style="text-align: center; margin: 28px 0;">
            <a href="{reset_url}" style="background: #2E7D32; color: #fff; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: bold;">Reset Password</a>
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


def send_kyc_status_email(to_email: str, first_name: str, approved: bool, reason: str = None):
    if approved:
        content = f"""
            <h2 style="color: #1A1A1A;">Verification Approved ✅</h2>
            <p style="color: #555; font-size: 15px;">Hi {first_name}, your KYC documents have been verified. You now have a verified badge on your profile.</p>
        """
    else:
        content = f"""
            <h2 style="color: #1A1A1A;">Verification Update</h2>
            <p style="color: #555; font-size: 15px;">Hi {first_name}, your KYC submission needs attention.</p>
            <p style="color: #c62828; font-size: 14px;">Reason: {reason or 'Documents did not meet requirements'}</p>
        """
    _send_email(to_email, "Afritide Verification Update", _email_wrapper(content))


def send_support_notification(name: str, email: str, topic: str, message: str, ticket_id: str):
    """Notify admin of new support ticket"""
    content = f"""
        <h2 style="color: #1A1A1A;">New Support Ticket #{ticket_id[:8].upper()}</h2>
        <table style="width:100%; border-collapse:collapse;">
            <tr><td style="padding:8px; color:#555; font-size:14px;"><strong>From:</strong></td><td style="padding:8px; color:#333; font-size:14px;">{name}</td></tr>
            <tr><td style="padding:8px; color:#555; font-size:14px;"><strong>Email:</strong></td><td style="padding:8px; color:#333; font-size:14px;">{email}</td></tr>
            <tr><td style="padding:8px; color:#555; font-size:14px;"><strong>Topic:</strong></td><td style="padding:8px; color:#333; font-size:14px;">{topic}</td></tr>
        </table>
        <div style="background:#f5f5f5; padding:16px; border-radius:8px; margin-top:16px;">
            <p style="color:#333; font-size:14px; margin:0;">{message}</p>
        </div>
        <div style="text-align:center; margin-top:20px;">
            <a href="https://www.afritidegroup.com/dashboard/admin/support"
               style="background:#2E7D32; color:#fff; padding:12px 24px; border-radius:6px; text-decoration:none; font-weight:bold;">
               View in Admin Dashboard
            </a>
        </div>
    """
    _send_email(
        settings.SMTP_USER or "olayinkainchrist@gmail.com",
        f"[Support] {topic} — {name}",
        _email_wrapper(content)
    )


def send_support_reply(to_email: str, name: str, topic: str, reply: str):
    """Send admin reply to user"""
    content = f"""
        <h2 style="color: #1A1A1A;">Response to your support request</h2>
        <p style="color:#555; font-size:15px;">Hi {name}, we've responded to your request regarding: <strong>{topic}</strong></p>
        <div style="background:#E8F5E9; padding:16px; border-radius:8px; margin:20px 0; border-left:4px solid #2E7D32;">
            <p style="color:#1A1A1A; font-size:14px; margin:0; line-height:1.6;">{reply}</p>
        </div>
        <p style="color:#888; font-size:13px;">If you need further assistance, please visit our support page.</p>
        <div style="text-align:center; margin-top:20px;">
            <a href="https://www.afritidegroup.com/support"
               style="background:#2E7D32; color:#fff; padding:12px 24px; border-radius:6px; text-decoration:none; font-weight:bold;">
               Visit Support Center
            </a>
        </div>
    """
    _send_email(to_email, f"Re: {topic} — Afritide Support", _email_wrapper(content))