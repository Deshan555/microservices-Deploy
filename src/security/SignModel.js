class SignModel {
    constructor(
        userEmail,
        userId,
        userType,
        loginTime,
        userName,
        tenant,
        principalType,
    ) {
        this.userEmail = userEmail;
        this.userName = userName;
        this.userId = userId;
        this.userType = userType;
        this.loginTime = loginTime;
        this.principalType = principalType;
        this.tenantId = tenant.id;
        this.tenantSlug = tenant.slug;
        this.tenantName = tenant.name;
    }
}

module.exports = SignModel;
