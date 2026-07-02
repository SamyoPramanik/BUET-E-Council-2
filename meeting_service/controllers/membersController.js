const CustomError = require('../errors/CustomError');

const getMembers = async (req, res, next) => {
    try {
        // TODO: Get members
        res.status(200).json({ success: true, data: [] });
    } catch (error) {
        next(error);
    }
};

const createMember = async (req, res, next) => {
    try {
        // TODO: Create member
        res.status(201).json({ success: true, message: 'Member created' });
    } catch (error) {
        next(error);
    }
};

const updateMember = async (req, res, next) => {
    try {
        // TODO: Update member
        res.status(200).json({ success: true, message: 'Member updated' });
    } catch (error) {
        next(error);
    }
};

const deleteMember = async (req, res, next) => {
    try {
        // TODO: Delete member
        res.status(200).json({ success: true, message: 'Member deleted' });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getMembers,
    createMember,
    updateMember,
    deleteMember
};
