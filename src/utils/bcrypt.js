const bcrypt = require('bcrypt');

// Hash the password before saving it to the database
const hashPassword = async (password) => {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
};
// Compare the password with the hashed password in the database
const comparePassword = async (password, hashedPassword) => {
    return bcrypt.compare(password, hashedPassword);
};


module.exports = {
    hashPassword,
    comparePassword,
};