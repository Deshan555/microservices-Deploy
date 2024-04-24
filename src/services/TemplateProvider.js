const logger = require('../config/logger');

const TemplateProvider = {
    generateRegistrationEmail: (username, email, password) => {
        const htmlTemplate = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Registration Successful</title>
            <style>
                body {
                                        font-family: Arial, sans-serif;
                                        background-color: #f4f4f4;
                                        margin: 0;
                                        padding: 0;
                                    }
                                    .container {
                                        max-width: 600px;
                                        margin: 20px auto;
                                        background-color: #fff;
                                        padding: 20px;
                                        border-radius: 5px;
                                        box-shadow: 0 0 10px rgba(0,0,0,0.1);
                                    }
                                    h1 {
                                        color: #333;
                                    }
                                    p {
                                        color: #666;
                                    }
                                    .footer {
                                        margin-top: 20px;
                                        text-align: center;
                                        color: #999;
                                    }
                                </style>
                            </head>
                            <body>
                                <div class="container">
                                    <h1>Registration Successful</h1>
                                    <p>Hello ${username},</p>
                                    <p>Your registration was successful. Below are your login details:</p>
                                    <ul>
                                        <li><strong>Email:</strong> ${email}</li>
                                        <li><strong>Password:</strong> ${password}</li>
                                        <!-- Add any other details here -->
                                    </ul>
                                    <p>You can now login using the provided credentials.</p>
                                    <p>Thank you for registering with us.</p>
                                    <div class="footer">
                                        <p>This is an automated message. Please do not reply.</p>
                                    </div>
                                </div>
                            </body>
                            </html>
                        `;
        logger.info('Registration email template generated');
        return htmlTemplate;
    },
    genarateRegisterCustomer: (username, email, password) => {
        const htmlTemplate = `
                            <!DOCTYPE html>
                    <html lang="en">
                    <head>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <title>Registration Successful</title>
                        <style>
                            body {
                                font-family: Arial, sans-serif;
                                background-color: #f4f4f4;
                                margin: 0;
                                padding: 0;
                            }
                            .container {
                                max-width: 600px;
                                margin: 20px auto;
                                background-color: #fff;
                                padding: 20px;
                                border-radius: 5px;
                                box-shadow: 0 0 10px rgba(0,0,0,0.1);
                            }
                            h1 {
                                color: #333;
                            }
                            p {
                                color: #666;
                            }
                            .footer {
                                margin-top: 20px;
                                text-align: center;
                                color: #999;
                            }
                        </style>
                    </head>
                    <body>
                        <div class="container">
                            <h1>Registration Successful</h1>
                            <p>Hello ${username},</p>
                            <p>Your registration was successful. Below are your login details:</p>
                            <ul>
                                <li><strong>Email:</strong> ${email}</li>
                                <li><strong>Password:</strong> ${password}</li>
                                <!-- Add any other details here -->
                            </ul>
                            <p>You can now login using the provided credentials.</p>
                            <p>Thank you for registering with us.</p>
                            <div class="footer">
                                <p>This is an automated message. Please do not reply.</p>
                            </div>
                        </div>
                    </body>
                    </html>
                        `;
        logger.info('Registration email template generated');
        return htmlTemplate;

    },
    genrateProfileUpdateTemplate: (username, email) => {
        const htmlTemplate = `
                            <!DOCTYPE html>
                            <html lang="en">
                            <head>
                                <meta charset="UTF-8">
                                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                                <title>Profile Update</title>
                                <style>
                                    body {
                                        font-family: Arial, sans-serif;
                                        background-color: #f4f4f4;
                                        margin: 0;
                                        padding: 0;
                                    }
                                    .container {
                                        max-width: 600px;
                                        margin: 20px auto;
                                        background-color: #fff;
                                        padding: 20px;
                                        border-radius: 5px;
                                        box-shadow: 0 0 10px rgba(0,0,0,0.1);
                                    }
                                    h1 {
                                        color: #333;
                                    }
                                    p {
                                        color: #666;
                                    }
                                    .footer {
                                        margin-top: 20px;
                                        text-align: center;
                                        color: #999;
                                    }
                                </style>
                            </head>
                            <body>
                                <div class="container">
                                    <h1>Profile Update</h1>
                                    <p>Hello ${username},</p>
                                    <p>Your profile has been updated successfully.</p>
                                    <ul>
                                        <li><strong>Email:</strong> ${email}</li>
                                        <!-- Add any other details here -->
                                    </ul>
                                    <p>Thank you for updating your profile with us.</p>
                                    <div class="footer">
                                        <p>This is an automated message. Please do not reply.</p>
                                    </div>
                                </div>
                            </body>
                            </html>
                        `;
        logger.info('Profile update email template generated');
        return htmlTemplate;
    },
    generateOrderConfirmation: (orderData) => {
        const htmlTemplate = `
                                <!DOCTYPE html>
                                <html lang="en">
                                <head>
                                    <meta charset="UTF-8">
                                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                                    <title>Fertilizer Order Update Notification</title>
                                    <style>
                                        body {
                                            font-family: Poppins, sans-serif;
                                            background-color: #f4f4f4;
                                            margin: 0;
                                            padding: 0;
                                        }
                                        .container {
                                            max-width: 600px;
                                            margin: 20px auto;
                                            background-color: #fff;
                                            padding: 20px;
                                            border-radius: 5px;
                                            box-shadow: 0 0 10px rgba(0,0,0,0.1);
                                        }
                                        h1 {
                                            color: #333;
                                        }
                                        p {
                                            color: #666;
                                            font-size: 12px;
                                            font-family: monospace;
                                        }
                                        .footer {
                                            margin-top: 20px;
                                            text-align: center;
                                            color: #999;
                                        }
                                        li{
                                            font-size: 12px;
                                            font-family: monospace;
                                        }
                                    </style>
                                </head>
                                <body>
                                <div class="container">
                                    <h1>Fertilizer Order Update Notification</h1>
                                    ${orderData.ApprovalStatus === 'APPROVED' ?
                `<p>Your order has been approved. You will be notified once the order has been delivered.
                                    <ul style="list-style-type: none">
                                    <li>Tracking ID: ${orderData.TrackingID}</li>
                                    <li>Fertilizer Code: ${orderData.FertilizerID}</li>
                                    <li>Field ID: ${orderData.FieldID}</li>
                                    <li>Requested Quantity: ${orderData.OrderQuentity}Kg</li>
                                    <li>Approved Quantity: ${orderData.ApprovedQuantity}Kg</li>
                                    <li>Order Date: ${new Date(orderData.OrderDate).toLocaleDateString()}</li>
                                    <li>Requested Deadline: ${new Date(orderData.RequestedDeadLine).toLocaleDateString()}</li>
                                    <li>Order Status: ${orderData.CustomerOrderStatus}</li>
                                    <li>Approval Status: ${orderData.ApprovalStatus}</li>
                                    <li>Payment Status: ${orderData.PaymentStatus}</li>
                                    <li>Remark: ${orderData.Remarks}</li>
                                    <li>Approve Date: ${new Date(orderData.ApproveDate).toLocaleDateString()}</li>
                                    <li>Supposed Delivery Date: ${new Date(orderData.SupposedDeliveryDate).toLocaleDateString()}</li>
                                    <li>Is Delivered: ${orderData.IsDelivered}</li>
                                    <li>Full Payment: LKR ${orderData.OrderValue}.00</li>
                                </ul>
                                        <pre>
                                        ${orderData.PaymentStatus === 'PAID' ? '<p>Your payment has been received. You will be notified once the order has been delivered.</p>' : ''}
                                        ${orderData.PaymentStatus === 'UNPAID' ? '<p>Your payment is pending. Please complete the payment to proceed with the order.</p>' : ''}
                                        </pre>
                                    </p>` : ''}
                                    ${orderData.ApprovalStatus === 'REJECTED' ? '<p>Your order has been rejected. Please contact the administrator for more details.</p>' : ''}
                                    
                                    <div class="footer">
                                        <p>This is an automated message. Please do not reply.</p>
                                        <img src="https://ibb.co/S39tXTk" alt="Thaprobane Logo" style="width: 100px; height: auto;">
                                    </div>
                                </div>
                            </body>
                            
                                </html>
                            `;
        return htmlTemplate;
    }

}

module.exports = TemplateProvider;
