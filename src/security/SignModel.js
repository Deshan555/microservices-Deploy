class SignModel {
    constructor(userEmail, userId, userType, loginTime, userName) {
        this.userEmail = userEmail;
        this.userName = userName;
        this.userId = userId;
        this.userType = userType;
        this.loginTime = loginTime;
    }
}

module.exports = SignModel;
