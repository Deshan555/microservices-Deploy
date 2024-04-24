const ComplaintsModel = require('../models/Complaints');
const { successResponse, errorResponse } = require('../utils/responseUtils');
const logger = require('../config/logger');

const ComplaintService = {
    getAllComplaints: async (req, res) => {
        try{
            const results = await ComplaintsModel.getAllComplaints();
            if (results.length === 0) return errorResponse(res, 'No complaints found', 404);
            successResponse(res, 'Complaints retrieved successfully', results);
        } catch (error) {
            console.error('Error getting complaints:', error);
            errorResponse(res, 'Error Occurred while fetching complaints : '+error);
        }
    },
    addComplaint: async (req, res) => {
        const { ComplaintDate, 
            ComplaintDescription, 
            ComplaintStatus, 
            ComplaintType, 
            ComplainerName } = req.body;
        try{
            const results = await ComplaintsModel.addComplaint(ComplaintDate, ComplaintDescription, ComplaintStatus, ComplaintType, ComplainerName);
            successResponse(res, 'Complaint added successfully', results);
        } catch (error) {
            logger.error('Error Occurred while adding complaint : '+error);
            errorResponse(res, 'Error Occurred while adding complaint : '+error);
        }
    },
    updateComplaint: async (req, res) => {
        const { ComplaintID, ComplaintStatus, ComplaintType } = req.body;
        try{
            const results = await ComplaintsModel.updateComplaint(ComplaintID, ComplaintStatus, ComplaintType);
            successResponse(res, 'Complaint updated successfully', results);
        } catch (error) {
            logger.error('Error Occurred while updating complaint : '+error);
            errorResponse(res, 'Error Occurred while updating complaint : '+error);
        }
    },
    deleteComplaint: async (req, res) => {
        const { ComplaintID } = req.body;
        try{
            const results = await ComplaintsModel.deleteComplaint(ComplaintID);
            successResponse(res, 'Complaint deleted successfully', results);
        } catch (error) {
            logger.error('Error Occurred while deleting complaint : '+error);
            errorResponse(res, 'Error Occurred while deleting complaint : '+error);
        }
    }
}

module.exports = ComplaintService;