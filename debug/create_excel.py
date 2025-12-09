from openpyxl import Workbook

wb = Workbook()
ws = wb.active
ws.title = "Contacts"

# Add headers
ws.append(["LicensePlate", "OwnerName", "Phone", "Email"])

# Add dummy data
ws.append(["ABC1234", "John Doe", "+1234567890", "john@example.com"])
ws.append(["XYZ9876", "Jane Smith", "+0987654321", "jane@example.com"])

wb.save("emergency_contacts.xlsx")
print("created emergency_contacts.xlsx")
