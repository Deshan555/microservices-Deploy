const FertilizerApprovalModal = require('../models/FertilizerApproval');
const { successResponse, errorResponse } = require('../utils/responseUtils');
const EmailService = require('../services/MailService');
const TemplateProvider = require('../services/TemplateProvider');
const FertilizerInfoModel = require('../models/FertilizerInfo');
const CustomerModel = require('../models/Customers');
const FieldModel = require('../models/FieldInfo');

const logger = require('../config/logger');

const FertilizersApprovalService = {
    getallOrdersList: async (req, res) => {
        try {
            const results = await FertilizerApprovalModal.getAllFertilizerRelatedRecords();
            if (results.length === 0) return errorResponse(res, 'No Orders found', 404);
            successResponse(res, 'Orders retrieved successfully', results)
        } catch (error) {
            logger.error('Error getting Orders:', error);
            errorResponse(res, 'Error Occurred while fetching Orders : ' + error);
        }
    },
    getOrdersByFertilizerID: async (req, res) => {
        const { FertilizerID } = req.params;
        try {
            const results = await FertilizerApprovalModal.getFertilizerApprovalByID(FertilizerID);
            if (results.length === 0) return errorResponse(res, 'No Orders found', 404);
            successResponse(res, 'Orders retrieved successfully', results)
        } catch (error) {
            logger.error('Error getting Orders:', error);
            errorResponse(res, 'Error Occurred while fetching Orders : ' + error);
        }
    },
    placeOrder: async (req, res) => {
        const { FertilizerID, FieldID, OrderQuentity, OrderDate, RequestedDeadLine, CustomerOrderStatus } = req.body;
        if (!FertilizerID || !FieldID || !OrderQuentity || !OrderDate || !RequestedDeadLine || !CustomerOrderStatus) {
            return errorResponse(res, 'All fields are required', 400);
        } try {
            const ApprovalStatus = 'PENDING';
            const ApprovedQuantity = 0;
            const ApprovedBy = null;
            const PaymentStatus = 'UNPAID';
            const Remarks = null;
            const ApproveDate = null;
            const SupposedDeliveryDate = null;
            const IsDelivered = 'NO';
            const result = await FertilizerApprovalModal.placeFertilizerOrder(FertilizerID, FieldID, OrderQuentity, OrderDate, RequestedDeadLine, CustomerOrderStatus, ApprovalStatus, ApprovedQuantity, ApprovedBy, PaymentStatus, Remarks, ApproveDate, SupposedDeliveryDate, IsDelivered);
            const getOrderByID = await FertilizerApprovalModal.getFertilizerApprovalByID(result.insertId);
            logger.info('Order placed successfully');
            successResponse(res, 'Order placed successfully', getOrderByID);
        } catch (error) {
            logger.error('Error placing order:', error);
            errorResponse(res, 'Error Occurred while placing order : ' + error);
        }
    },
    updateOrderByCustomers: async (req, res) => {
        const { ORDER_ID } = req.params;
        const { OrderQuentity, RequestedDeadLine, CustomerOrderStatus } = req.body;
        try {
            const getOrderByID = await FertilizerApprovalModal.getFertilizerApprovalByID(ORDER_ID);
            if (getOrderByID.length === 0) return errorResponse(res, 'Order not found', 404);
            const result = await FertilizerApprovalModal.updateOrderByCustomers(ORDER_ID, OrderQuentity, RequestedDeadLine, CustomerOrderStatus);
            const getOrderByIDAfterUpdate = await FertilizerApprovalModal.getFertilizerApprovalByID(ORDER_ID);
            logger.info('Order updated successfully : ', getOrderByIDAfterUpdate);
            successResponse(res, 'Order updated successfully', getOrderByIDAfterUpdate);
        } catch (error) {
            logger.error('Error updating order:', error);
            errorResponse(res, 'Error Occurred while updating order : ' + error);
        }
    },
    orderApprovalByAdmin: async (req, res) => {
        const { ORDER_ID } = req.params;
        const { ApprovalStatus, ApprovedQuantity, ApprovedBy, PaymentStatus, Remarks, ApproveDate, SupposedDeliveryDate, IsDelivered } = req.body;
        try {
            const getOrderByID = await FertilizerApprovalModal.getFertilizerApprovalByID(ORDER_ID);
            if (getOrderByID.length === 0) return errorResponse(res, 'Order not found', 404);
            console.log(getOrderByID);
            if (ApprovalStatus === 'REJECTED') {
                try {
                    const result = await FertilizerApprovalModal.rejectFertilizerOrder(ORDER_ID);
                    const getOrderByIDAfterUpdate = await FertilizerApprovalModal.getFertilizerApprovalByID(ORDER_ID);
                    // SEND EMAIL
                    const FertilizerID = getOrderByID[0]?.FertilizerID;
                    const FieldID = getOrderByID[0]?.FieldID
                    const getFertilizerInfo = await FertilizerInfoModel.getFertilizerInfoByID(FertilizerID).catch(err => {
                        throw new Error(`Error getting fertilizer info: ${err.message}`);
                    });
                    const getFieldInfo = await FieldModel.getFieldInfoByID(FieldID).catch(err => {
                        throw new Error(`Error getting field info: ${err.message}`);
                    });
                    const getCustomerInfo = await CustomerModel.getCustomerByID(getFieldInfo[0]?.OwnerID).catch(err => {
                        throw new Error(`Error getting customer info: ${err.message}`);
                    });
                    const customerEmail = getCustomerInfo[0]?.CustomerEmail;
                    try {
                        const genarateEmailTemplate = TemplateProvider.generateOrderConfirmation(getOrderByIDAfterUpdate[0]);
                        const email = {
                            to: customerEmail,
                            subject: 'Order Rejection',
                            html: genarateEmailTemplate
                        }
                        await EmailService.sendSingleEmail(email).catch(err => {
                            throw new Error(`Error sending email: ${err.message}`);
                        });
                        logger.info('Email sent successfully');
                    } catch (error) {
                        logger.error('Error sending email:', error);
                    }
                    logger.info('Order updated successfully : ', getOrderByIDAfterUpdate);
                    successResponse(res, 'Order updated successfully', getOrderByIDAfterUpdate);
                } catch (error) {
                    logger.error('Error updating order:', error);
                    errorResponse(res, 'Error Occurred while updating order : ' + error);
                }
            } else {
            try {
                const FertilizerID = getOrderByID[0]?.FertilizerID;
                const FieldID = getOrderByID[0]?.FieldID;
                const getFertilizerInfo = await FertilizerInfoModel.getFertilizerInfoByID(FertilizerID).catch(err => {
                    throw new Error(`Error getting fertilizer info: ${err.message}`);
                });
                const getFieldInfo = await FieldModel.getFieldInfoByID(FieldID).catch(err => {
                    throw new Error(`Error getting field info: ${err.message}`);
                });
                const getCustomerInfo = await CustomerModel.getCustomerByID(getFieldInfo[0]?.OwnerID).catch(err => {
                    throw new Error(`Error getting customer info: ${err.message}`);
                });
                const customerEmail = getCustomerInfo[0]?.CustomerEmail;
                const updateQuentity = getFertilizerInfo[0]?.FertilizerQuantity - ApprovedQuantity;
                const updateQuentityResult = await FertilizerInfoModel.updateQuntity(FertilizerID, updateQuentity).catch(err => {
                    throw new Error(`Error updating quantity: ${err.message}`);
                });
                const OrderValue = getFertilizerInfo[0]?.FertilizerPrice * ApprovedQuantity;
                const result = await FertilizerApprovalModal.adminApprovalOrder(ORDER_ID, ApprovalStatus, ApprovedQuantity, ApprovedBy, PaymentStatus, Remarks, ApproveDate, SupposedDeliveryDate, IsDelivered, OrderValue).catch(err => {
                    throw new Error(`Error approving order: ${err.message}`);
                });
                const getOrderByIDAfterUpdate = await FertilizerApprovalModal.getFertilizerApprovalByID(ORDER_ID).catch(err => {
                    throw new Error(`Error getting order by ID after update: ${err.message}`);
                });
                console.log('Order updated successfully : ', getOrderByIDAfterUpdate);
                try {
                    const genarateEmailTemplate = TemplateProvider.generateOrderConfirmation(getOrderByIDAfterUpdate[0]);
                    const email = {
                        to: customerEmail,
                        subject: 'Order Confirmation',
                        html: genarateEmailTemplate
                    }
                    await EmailService.sendSingleEmail(email).catch(err => {
                        throw new Error(`Error sending email: ${err.message}`);
                    });
                    logger.info('Email sent successfully');
                } catch (error) {
                    logger.error('Error sending email:', error);
                }
                logger.info('Order updated successfully : ', getOrderByIDAfterUpdate);
                successResponse(res, 'Order updated successfully', getOrderByIDAfterUpdate);
            } catch (error) {
                logger.error('Error updating order:', error);
                errorResponse(res, 'Error Occurred while updating order : ' + error);
            }
        }
        } catch (error) {
            logger.error('Error updating order:', error);
            errorResponse(res, 'Error Occurred while updating order : ' + error);
        }
    },
    changeOrderDeliverStatus: async (req, res) => {
        const { ORDER_ID } = req.params;
        const { IsDelivered } = req.body;
        try {
            const getOrderByID = await FertilizerApprovalModal.getFertilizerApprovalByID(ORDER_ID);
            if (getOrderByID.length === 0) return errorResponse(res, 'Order not found', 404);
            const result = await FertilizerApprovalModal.changeDeliverStaus(ORDER_ID, IsDelivered);
            const getOrderByIDAfterUpdate = await FertilizerApprovalModal.getFertilizerApprovalByID(ORDER_ID);
            logger.info('Order updated successfully : ', getOrderByIDAfterUpdate);
            successResponse(res, 'Order updated successfully', getOrderByIDAfterUpdate);
        } catch (error) {
            logger.error('Error updating order:', error);
            errorResponse(res, 'Error Occurred while updating order : ' + error);
        }
    },
    rejectPlacedOrder: async (req, res) => {
        const { ORDER_ID } = req.params;
        try {
            const getOrderByID = await FertilizerApprovalModal.getFertilizerApprovalByID(ORDER_ID);
            if (getOrderByID.length === 0) return errorResponse(res, 'Order not found', 404);
            const result = await FertilizerApprovalModal.rejectFertilizerOrder(ORDER_ID);
            const getOrderByIDAfterUpdate = await FertilizerApprovalModal.getFertilizerApprovalByID(ORDER_ID);
            logger.info('Order updated successfully : ', getOrderByIDAfterUpdate);
            successResponse(res, 'Order updated successfully', getOrderByIDAfterUpdate);
        } catch (error) {
            logger.error('Error updating order:', error);
            errorResponse(res, 'Error Occurred while updating order : ' + error);
        }
    },
    deleteOrder: async (req, res) => {
        const { ORDER_ID } = req.params;
        try {
            const getOrderByID = await FertilizerApprovalModal.getFertilizerApprovalByID(ORDER_ID);
            if (getOrderByID.length === 0) return errorResponse(res, 'Order not found', 404);
            const result = await FertilizerApprovalModal.deleteFertilizerApproval(ORDER_ID);
            logger.info('Order deleted successfully');
            successResponse(res, 'Order deleted successfully', null);
        } catch (error) {
            logger.error('Error deleting order:', error);
            errorResponse(res, 'Error Occurred while deleting order : ' + error);
        }
    },
    dashboardPendingStatus: async (req, res) => {
        try {
            const results = await FertilizerApprovalModal.getOrdersWithPendingPaymentsAndApproved();
            if (results.length === 0) return errorResponse(res, 'No Orders found', 404);
            successResponse(res, 'Orders retrieved successfully', results)
        } catch (error) {
            logger.error('Error getting Orders:', error);
            errorResponse(res, 'Error Occurred while fetching Orders : ' + error);
        }
    },
    getFertilizerOrdersByFieldID: async (req, res) => {
        const { fieldID } = req.params;
        try {
            const results = await FertilizerApprovalModal.getFertilizerOrdersByFieldID(fieldID);
            if (results.length === 0) return errorResponse(res, 'No Orders found', 404);
            successResponse(res, 'Orders retrieved successfully', results)
        } catch (error) {
            logger.error('Error getting Orders:', error);
            errorResponse(res, 'Error Occurred while fetching Orders : ' + error);
        }
    },
    rejectOrderByRequester: async (req, res) => {
        const { ORDER_ID } = req.params;
        try {
            const getOrderByID = await FertilizerApprovalModal.getFertilizerApprovalByID(ORDER_ID);
            if (getOrderByID.length === 0) return errorResponse(res, 'Order not found', 404);
            const result = await FertilizerApprovalModal.rejectFertilizerOrder(ORDER_ID);
            const getOrderByIDAfterUpdate = await FertilizerApprovalModal.getFertilizerApprovalByID(ORDER_ID);
            logger.info('Order updated successfully : ', getOrderByIDAfterUpdate);
            successResponse(res, 'Order updated successfully', getOrderByIDAfterUpdate);
        } catch (error) {
            logger.error('Error updating order:', error);
            errorResponse(res, 'Error Occurred while updating order : ' + error);
        }
    }
}

module.exports = FertilizersApprovalService;

