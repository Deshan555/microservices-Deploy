let io = null;

function setRealtimeServer(server) {
    io = server;
}

function emitToCustomer(customerID, event, payload) {
    io?.to(`customer:${customerID}`).emit(event, payload);
}

function emitToTenantStaff(tenantID, event, payload) {
    io?.to(`tenant-staff:${tenantID}`).emit(event, payload);
}

module.exports = {
    emitToCustomer,
    emitToTenantStaff,
    setRealtimeServer,
};
