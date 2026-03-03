import { sendEmail } from "./email.service.js";
import { supabase } from "../config/supabase.js";
import { vehicleEmailTemplate } from "./email.template.js";

// Helper function to get all recipients (staff_email, user_email, admin emails)
const getRecipients = async (assetId) => {
    // Get vehicle + staff info
    const { data: vehicle } = await supabase
        .from("assets")
        .select(`
            id,
            name,
            department_id,
            assigned_user_id,
            vehicle_details(
                staff_name,
                staff_email
            )
        `)
        .eq("id", assetId)
        .single();

    if (!vehicle) return { vehicle: null, recipients: [] };

    // Get Admin emails
    const { data: admins } = await supabase
        .from("users")
        .select("email")
        .eq("role", "admin")
        .eq("department_id", vehicle.department_id);

    const adminEmails = admins?.map(a => a.email) || [];

    // Get staff email from vehicle_details
    let staffEmail = vehicle.vehicle_details?.[0]?.staff_email;

    // Get user email from assigned_user_id
    let userEmail = null;
    if (vehicle.assigned_user_id) {
        const { data: user } = await supabase
            .from("users")
            .select("email")
            .eq("id", vehicle.assigned_user_id)
            .single();
        userEmail = user?.email;
    }

    // Combine all recipients: staff_email, user_email, admin emails
    const recipients = [
        staffEmail,
        userEmail,
        ...adminEmails
    ].filter(Boolean);

    // Remove duplicates
    const uniqueRecipients = [...new Set(recipients)];

    return { vehicle, recipients: uniqueRecipients };
};

export const notifyVehicleEvent = async ({
    assetId,
    type,
    title: emailTitle,
    message
}) => {
    const { vehicle, recipients } = await getRecipients(assetId);

    if (!vehicle) {
        console.log("Vehicle not found for assetId:", assetId);
        return;
    }

    if (recipients.length === 0) {
        console.log("No recipients found for vehicle:", vehicle.name);
        return;
    }

    console.log("Sending email to:", recipients);

    const htmlContent = vehicleEmailTemplate({
        title: emailTitle,
        subtitle: "Vehicle Notification",
        vehicleName: vehicle.name,
        message,
        dueDate: null,
        actionType: type
    });

    // Send Email
    await sendEmail({
        to: recipients,
        subject: emailTitle,
        html: htmlContent
    });
};

// New function for sending notifications from frontend
// Sends to staff_email, user_email (assigned user), and admin emails
export const sendEmailNotification = async ({ type, actionType, data }) => {
    try {
        const assetId = data.asset_id;

        if (!assetId) {
            return { success: false, error: "Asset ID is required" };
        }

        const { vehicle, recipients } = await getRecipients(assetId);

        if (!vehicle) {
            return { success: false, error: "Vehicle not found" };
        }

        if (recipients.length === 0) {
            return { success: false, error: "No recipients found" };
        }

        let title, message, dueDate;

        if (type === "document") {
            title = actionType;
            message = `A document has been ${actionType.toLowerCase().replace('new ', '').replace('updated ', '')} for ${vehicle.name}.`;
            dueDate = data.expiry_date || null;
        } else if (type === "maintenance") {
            title = actionType;
            message = `A maintenance record has been ${actionType.toLowerCase().replace('new ', '').replace('updated ', '')} for ${vehicle.name}.`;
            dueDate = data.next_due || null;
        }

        const htmlContent = vehicleEmailTemplate({
            title,
            subtitle: actionType,
            vehicleName: vehicle.name,
            message,
            dueDate,
            actionType
        });

        await sendEmail({
            to: recipients,
            subject: title,
            html: htmlContent
        });

        console.log(`Email sent successfully to: ${recipients.join(', ')}`);

        return { success: true, recipients };
    } catch (error) {
        console.error("Error sending email notification:", error);
        return { success: false, error: error.message };
    }
};

// Optimized Cron job function for expiry/reminder check
// Checks for: overdue, due soon (30 days), and expiring in 3 months (90 days)
// Processes in batches to avoid timeout
export const sendThreeMonthExpiryReminder = async () => {
    const MAX_RECORDS_PER_RUN = 50; // Process max 50 records per cron run
    const BATCH_SIZE = 10; // Process 10 records at a time
    
    try {
        console.log("========================================");
        console.log("Running EXPIRY REMINDER CHECK (Optimized)...");
        console.log("Checking for: OVERDUE, DUE SOON (30 days), and 3-MONTH warnings");
        console.log("Max records per run:", MAX_RECORDS_PER_RUN);
        console.log("========================================");

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let emailsSent = 0;
        let recordsProcessed = 0;

        // ============================================
        // CHECK DOCUMENTS (with limit)
        // ============================================
        console.log("\n--- Checking DOCUMENTS ---");
        
        const { data: documents } = await supabase
            .from("documents")
            .select(`
                id,
                name,
                expiry_date,
                asset_id,
                assets(
                    id,
                    name,
                    department_id,
                    assigned_user_id,
                    vehicle_details(
                        staff_name,
                        staff_email
                    )
                )
            `)
            .limit(MAX_RECORDS_PER_RUN);

        console.log(`Found ${documents?.length || 0} document records (limited to ${MAX_RECORDS_PER_RUN})`);

        // Process documents in batches
        for (let i = 0; i < (documents?.length || 0); i += BATCH_SIZE) {
            const batch = (documents || []).slice(i, i + BATCH_SIZE);
            
            // Process batch in parallel
            await Promise.all(batch.map(async (doc) => {
                if (!doc.expiry_date) return;

                const expiryDate = new Date(doc.expiry_date);
                const daysUntilExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
                
                let shouldNotify = false;
                let notificationType = "";
                let title = "";
                let subtitle = "";

                // OVERDUE - past expiry date
                if (daysUntilExpiry < 0) {
                    shouldNotify = true;
                    notificationType = "OVERDUE";
                    title = "Document Overdue!";
                    subtitle = "Document Overdue Alert";
                }
                // DUE SOON - within 30 days
                else if (daysUntilExpiry <= 30) {
                    shouldNotify = true;
                    notificationType = "DUE SOON";
                    title = "Document Expiring Soon";
                    subtitle = "Due Soon Alert";
                }
                // 3-MONTH WARNING - within 3 months but more than 30 days
                else if (daysUntilExpiry <= 90) {
                    shouldNotify = true;
                    notificationType = "3-MONTH WARNING";
                    title = "Document Expiring in 3 Months";
                    subtitle = "3-Month Reminder";
                }

                if (shouldNotify) {
                    const { vehicle, recipients } = await getRecipients(doc.asset_id);

                    if (!vehicle || recipients.length === 0) {
                        console.log(`  Skipping ${doc.name} - no recipients found`);
                        return;
                    }

                    let message = "";
                    if (notificationType === "OVERDUE") {
                        message = `URGENT: Your document "${doc.name}" is OVERDUE by ${Math.abs(daysUntilExpiry)} days! Please renew immediately.`;
                    } else if (notificationType === "DUE SOON") {
                        message = `Warning: Your document "${doc.name}" will expire in ${daysUntilExpiry} days. Please take necessary action.`;
                    } else {
                        message = `Reminder: Your document "${doc.name}" will expire in ${daysUntilExpiry} days (approximately 3 months).`;
                    }

                    const htmlContent = vehicleEmailTemplate({
                        title,
                        subtitle,
                        vehicleName: vehicle.name,
                        message,
                        dueDate: doc.expiry_date,
                        actionType: notificationType
                    });

                    await sendEmail({
                        to: recipients,
                        subject: `[${notificationType}] ${doc.name} - ${vehicle.name}`,
                        html: htmlContent
                    });

                    emailsSent++;
                    console.log(`  ✓ ${notificationType}: ${doc.name} (${vehicle.name}) - ${daysUntilExpiry} days`);
                }
                
                recordsProcessed++;
            }));

            // Small delay between batches to avoid overwhelming the API
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        // ============================================
        // CHECK MAINTENANCE RECORDS (with limit)
        // ============================================
        console.log("\n--- Checking MAINTENANCE RECORDS ---");
        
        const { data: maintenance } = await supabase
            .from("maintenance_records")
            .select(`
                id,
                maintenance_type,
                next_due,
                asset_id,
                assets(
                    id,
                    name,
                    department_id,
                    assigned_user_id,
                    vehicle_details(
                        staff_name,
                        staff_email
                    )
                )
            `)
            .limit(MAX_RECORDS_PER_RUN);

        console.log(`Found ${maintenance?.length || 0} maintenance records (limited to ${MAX_RECORDS_PER_RUN})`);

        // Process maintenance in batches
        for (let i = 0; i < (maintenance?.length || 0); i += BATCH_SIZE) {
            const batch = (maintenance || []).slice(i, i + BATCH_SIZE);
            
            // Process batch in parallel
            await Promise.all(batch.map(async (maint) => {
                if (!maint.next_due) return;

                const dueDate = new Date(maint.next_due);
                const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

                let shouldNotify = false;
                let notificationType = "";
                let title = "";
                let subtitle = "";

                // OVERDUE - past due date
                if (daysUntilDue < 0) {
                    shouldNotify = true;
                    notificationType = "OVERDUE";
                    title = "Maintenance Overdue!";
                    subtitle = "Maintenance Overdue Alert";
                }
                // DUE SOON - within 30 days
                else if (daysUntilDue <= 30) {
                    shouldNotify = true;
                    notificationType = "DUE SOON";
                    title = "Maintenance Due Soon";
                    subtitle = "Due Soon Alert";
                }
                // 3-MONTH WARNING - within 3 months but more than 30 days
                else if (daysUntilDue <= 90) {
                    shouldNotify = true;
                    notificationType = "3-MONTH WARNING";
                    title = "Maintenance Due in 3 Months";
                    subtitle = "3-Month Reminder";
                }

                if (shouldNotify) {
                    const { vehicle, recipients } = await getRecipients(maint.asset_id);

                    if (!vehicle || recipients.length === 0) {
                        console.log(`  Skipping ${maint.maintenance_type} - no recipients found`);
                        return;
                    }

                    let message = "";
                    if (notificationType === "OVERDUE") {
                        message = `URGENT: Your maintenance "${maint.maintenance_type}" is OVERDUE by ${Math.abs(daysUntilDue)} days! Please service immediately.`;
                    } else if (notificationType === "DUE SOON") {
                        message = `Warning: Your maintenance "${maint.maintenance_type}" is due in ${daysUntilDue} days. Please schedule service.`;
                    } else {
                        message = `Reminder: Your maintenance "${maint.maintenance_type}" is due in ${daysUntilDue} days (approximately 3 months).`;
                    }

                    const htmlContent = vehicleEmailTemplate({
                        title,
                        subtitle,
                        vehicleName: vehicle.name,
                        message,
                        dueDate: maint.next_due,
                        actionType: notificationType
                    });

                    await sendEmail({
                        to: recipients,
                        subject: `[${notificationType}] ${maint.maintenance_type} - ${vehicle.name}`,
                        html: htmlContent
                    });

                    emailsSent++;
                    console.log(`  ✓ ${notificationType}: ${maint.maintenance_type} (${vehicle.name}) - ${daysUntilDue} days`);
                }
                
                recordsProcessed++;
            }));

            // Small delay between batches
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        console.log("\n========================================");
        console.log(`EXPIRY REMINDER JOB COMPLETED`);
        console.log(`Total records processed: ${recordsProcessed}`);
        console.log(`Total emails sent: ${emailsSent}`);
        console.log("========================================\n");

        return { success: true, emailsSent, recordsProcessed };
    } catch (error) {
        console.error("Error in expiry reminder:", error);
        return { success: false, error: error.message };
    }
};
