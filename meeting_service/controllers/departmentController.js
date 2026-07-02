const CustomError = require('../errors/CustomError');

const getDepartments = async (req, res, next) => {
    try {
        res.status(200).json({ success: true, data: [] });
    } catch (error) {
        next(error);
    }
};

const createDepartment = async (req, res, next) => {
    try {
        res.status(201).json({ success: true, message: 'Department created' });
    } catch (error) {
        next(error);
    }
};

const updateDepartment = async (req, res, next) => {
    try {
        res.status(200).json({ success: true, message: 'Department updated' });
    } catch (error) {
        next(error);
    }
};

const deleteDepartment = async (req, res, next) => {
    try {
        res.status(200).json({ success: true, message: 'Department deleted' });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getDepartments,
    createDepartment,
    updateDepartment,
    deleteDepartment
};
