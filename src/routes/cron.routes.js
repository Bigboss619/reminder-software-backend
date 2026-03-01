import express from 'express';
import { supabase } from "../config/supabase.js";
import { notifyVehicleEvent } from "../services/notification.service.js";

const router = express.Router();

// Cron endpoint for Supabase (one-time execution)
// Trigger: POST request from Supabase cron
router.post("/cron/reminders", async (req, res) => {
    try {
        console.log("Running reminder check via cron endpoint...");

        const today = new Date();
        today.setHours(0, 0, 0, 0); // Start of today
        
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1); // Start of tomorrow

        // 1️⃣ Check maintenance reminders
        const { data: maintenance } = await supabase
            .from("maintenance_records")
            .select("*");

        console.log("Found maintenance records:", maintenance?.length || 0);

        for (const m of maintenance || []) {
            if (!m.next_due || !m.reminder_days) continue;

            const dueDate = new Date(m.next_due);
            const reminderDate = new Date(dueDate);
            reminderDate.setDate(dueDate.getDate() - m.reminder_days);
            reminderDate.setHours(0, 0, 0, 0);

            // Send if reminder date is in the past OR today (not yet sent)
            if (reminderDate <= today) {
                console.log("  -> Sending maintenance reminder (due:", m.next_due, ")");
                await notifyVehicleEvent({
                    assetId: m.asset_id,
                    type: "Maintenance Reminder",
                    title: "Maintenance Reminder",
                    message: `Maintenance is due on ${m.next_due}`
                });
            }
        }

        // 2️⃣ Check document reminders
        const { data: documents } = await supabase
            .from("documents")
            .select("*");

        console.log("Found document records:", documents?.length || 0);

        for (const d of documents || []) {
            if (!d.expiry_date || !d.reminder_days) continue;

            const expiryDate = new Date(d.expiry_date);
            const reminderDate = new Date(expiryDate);
            reminderDate.setDate(expiryDate.getDate() - d.reminder_days);
            reminderDate.setHours(0, 0, 0, 0);

            // Send if reminder date is in the past OR today (not yet sent)
            if (reminderDate <= today) {
                console.log("  -> Sending document reminder (expiry:", d.expiry_date, ")");
                await notifyVehicleEvent({
                    assetId: d.asset_id,
                    type: "Car Document Reminder",
                    title: "Document Expiry Reminder",
                    message: `Document expires on ${d.expiry_date}`
                });
            }
        }

        console.log("Reminder check completed.");
        
        return res.status(200).json({ 
            success: true, 
            message: "Cron job executed successfully" 
        });
    } catch (error) {
        console.error("Error running cron job:", error);
        return res.status(500).json({ 
            success: false, 
            message: "Cron job failed",
            error: error.message 
        });
    }
});

export default router;
