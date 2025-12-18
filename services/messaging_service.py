import os
import json
import smtplib
import threading
import requests
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
from pymongo import MongoClient

from email.mime.image import MIMEImage

class MessagingService:
    def __init__(self, config_path="config.json", mongo_uri="mongodb://127.0.0.1:27017", db_name="accident_db"):
        self.config_path = config_path
        self.mongo_uri = mongo_uri
        self.db_name = db_name
        self.mongo_client = None
        self.db = None
        self._last_sent = {} # Key: recipient, Value: timestamp
        self._connect_db()

    def _connect_db(self):
        try:
            self.mongo_client = MongoClient(self.mongo_uri)
            self.db = self.mongo_client[self.db_name]
            print(f"[MessagingService] Connected to MongoDB: {self.db_name}", flush=True)
        except Exception as e:
            print(f"[MessagingService] Failed to connect to MongoDB: {e}", flush=True)

    def _get_system_config(self):
        """Fetch current system config from DB to check toggles and admin credentials."""
        if self.db is None:
            return {}
        try:
            return self.db.system_config.find_one({"config_id": "main"}) or {}
        except Exception as e:
            print(f"[MessagingService] DB Read Error: {e}", flush=True)
            return {}

    def _load_credentials(self):
        """
        Load API keys/passwords from config.json or Environment Variables.
        Prioritizes config.json if present.
        """
        creds = {
            "smtp_server": "smtp.gmail.com",
            "smtp_port": 587,
            "sender_email": "",
            "sender_password": "",
            "whatsapp_token": "",
            "whatsapp_phone_id": ""
        }
        
        # 1. Try config.json
        if os.path.exists(self.config_path):
            try:
                with open(self.config_path, 'r') as f:
                    file_creds = json.load(f)
                    creds.update(file_creds)
            except Exception as e:
                print(f"[MessagingService] Warning: Failed to load {self.config_path}: {e}", flush=True)

        # 2. Environment Variables (Override)
        if os.getenv("SENDER_EMAIL"): creds["sender_email"] = os.getenv("SENDER_EMAIL")
        if os.getenv("SENDER_PASSWORD"): creds["sender_password"] = os.getenv("SENDER_PASSWORD")
        if os.getenv("WHATSAPP_TOKEN"): creds["whatsapp_token"] = os.getenv("WHATSAPP_TOKEN")
        
        return creds

    def send_alert(self, contact_info, message_body, subject="Accident Alert", attachment_path=None):
        """
        Main entry point. valid `contact_info` dict:
        {
            "email": "...",
            "phone": "..." (e.g., "15550001234", must include country code for WhatsApp)
        }
        """
        # Check Cooldown (Simple global cooldown per recipient string)
        import time
        recipient_key = contact_info.get("email") or contact_info.get("phone")
        if recipient_key:
            last_time = self._last_sent.get(recipient_key, 0)
            if time.time() - last_time < 60:
                print(f"[MessagingService] Cooldown active for {recipient_key}. Skipping alert.", flush=True)
                return
            self._last_sent[recipient_key] = time.time()

        # Run in separate thread to be non-blocking
        t = threading.Thread(target=self._send_alert_sync, args=(contact_info, message_body, subject, attachment_path))
        t.start()

    def _send_alert_sync(self, contact_info, message_body, subject, attachment_path):
        sys_config = self._get_system_config()
        creds = self._load_credentials()

        # 1. Email
        if sys_config.get("email_alerts_enabled", False):
            recipient_email = contact_info.get("email")
            if recipient_email:
                self._send_email_smtp(creds, recipient_email, subject, message_body, attachment_path)
            else:
                print("[MessagingService] Email enabled but no recipient email provided.", flush=True)
        else:
            print("[MessagingService] Email alerts DISABLED in settings.", flush=True)

        # 2. WhatsApp
        if sys_config.get("whatsapp_alerts_enabled", False):
            recipient_phone = contact_info.get("phone")
            if recipient_phone:
                self._send_whatsapp_cloud(creds, recipient_phone, message_body)
            else:
                print("[MessagingService] WhatsApp enabled but no recipient phone provided.", flush=True)
        else:
            print("[MessagingService] WhatsApp alerts DISABLED in settings.", flush=True)

    def _send_email_smtp(self, creds, to_email, subject, body, attachment_path=None):
        sender = creds.get("sender_email")
        password = creds.get("sender_password")
        server_addr = creds.get("smtp_server")
        port = creds.get("smtp_port")

        if not sender or not password:
            print("[MessagingService] Mock Email: Creds missing. Would fetch credentials and send.", flush=True)
            print(f"   -> To: {to_email}", flush=True)
            print(f"   -> Subject: {subject}", flush=True)
            return

        try:
            msg = MIMEMultipart()
            msg['From'] = sender
            msg['To'] = to_email
            msg['Subject'] = subject
            msg.attach(MIMEText(body, 'plain'))
            
            if attachment_path and os.path.exists(attachment_path):
                try:
                    with open(attachment_path, 'rb') as f:
                        img_data = f.read()
                    image = MIMEImage(img_data, name=os.path.basename(attachment_path))
                    msg.attach(image)
                except Exception as img_err:
                    print(f"[MessagingService] Failed to attach image: {img_err}", flush=True)

            server = smtplib.SMTP(server_addr, port)
            server.starttls()
            server.login(sender, password)
            text = msg.as_string()
            server.sendmail(sender, to_email, text)
            server.quit()
            print(f"[MessagingService] Email SENT to {to_email}", flush=True)
        except Exception as e:
            print(f"[MessagingService] Email Failed: {e}", flush=True)

    def _send_whatsapp_cloud(self, creds, to_phone, message_text):
        token = creds.get("whatsapp_token")
        phone_id = creds.get("whatsapp_phone_id")

        if not token or not phone_id:
            print("[MessagingService] Mock WhatsApp: Creds missing. Would send Cloud API request.", flush=True)
            print(f"   -> To: {to_phone}", flush=True)
            print(f"   -> Msg: {message_text}", flush=True)
            return

        url = f"https://graph.facebook.com/v17.0/{phone_id}/messages"
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        payload = {
            "messaging_product": "whatsapp",
            "to": to_phone,
            "type": "text",
            "text": {"body": message_text}
        }

        try:
            resp = requests.post(url, headers=headers, json=payload)
            if resp.status_code in [200, 201]:
                print(f"[MessagingService] WhatsApp SENT to {to_phone}", flush=True)
            else:
                print(f"[MessagingService] WhatsApp Failed: {resp.status_code} - {resp.text}", flush=True)
        except Exception as e:
            print(f"[MessagingService] WhatsApp Ex: {e}", flush=True)

# Helper for direct testing
if __name__ == "__main__":
    # Test Mode
    import sys
    print("Testing MessagingService...")
    svc = MessagingService()
    
    # Mock some settings in DB if needed or just rely on defaults (which might be False)
    # Ideally, manually enable them in DB for test, or mock _get_system_config
    
    # Create a dummy config for testing if it doesn't exist
    if not os.path.exists("config.json"):
        dummy = {
            "sender_email": "test@example.com", 
            "sender_password": "xvzf... (app password)",
            "whatsapp_token": "EAAG...",
            "whatsapp_phone_id": "12345678"
        }
        # print("Note: Create 'config.json' with real credentials to test actual sending.")
    
    test_contact = {"email": "admin@example.com", "phone": "15551234567"}
    svc.send_alert(test_contact, "This is a TEST alert from the Accident Detection System.", "Test Alert")
