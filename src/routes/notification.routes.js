import express from 'express';
import { sendEmailNotification } from '../services/notification.service.js';

const router = express.Router();

// Send notification endpoint - called from frontend
// Body: { type: "new_document" | "new_maintenance" | "update_document" | "update_maintenance", document/maintenance: data }
router.post("/send-notification", async (req, res) => {
    try {
        const { type, document, maintenance } = req.body;

        if (!type) {
            return res.status(400).json({ error: "Notification type is required" });
        }

        let result;

        switch (type) {
            case "new_document":
            case "update_document":
                if (!document) {
                    return res.status(400).json({ error: "Document data is required" });
                }
                result = await sendEmailNotification({
                    type: "document",
                    actionType: type === "new_document" ? "New Document Added" : "Document Updated",
                    data: document
                });
                break;

            case "new_maintenance":
            case "update_maintenance":
                if (!maintenance) {
                    return res.status(400).json({ error: "Maintenance data is required" });
                }
                result = await sendEmailNotification({
                    type: "maintenance",
                    actionType: type === "new_maintenance" ? "New Maintenance Added" : "Maintenance Updated",
                    data: maintenance
                });
                break;

            default:
                return res.status(400).json({ error: "Invalid notification type" });
        }

        if (result.success) {
            res.status(200).json({ 
                success: true, 
                message: "Notification sent successfully",
                recipients: result.recipients
            });
        } else {
            res.status(500).json({ 
                success: false, 
                error: result.error 
            });
        }
    } catch (error) {
        console.error("Error sending notification:", error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

export default router;
