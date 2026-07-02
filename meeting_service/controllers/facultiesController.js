const CustomError = require('../errors/CustomError');

const getFaculties = async (req, res, next) => {
    try {
        // TODO: Get faculties
        res.status(200).json({ success: true, data: [] });
    } catch (error) {
        next(error);
    }
};

const createFaculty = async (req, res, next) => {
    try {
        // TODO: Create faculty
        res.status(201).json({ success: true, message: 'Faculty created' });
    } catch (error) {
        next(error);
    }
};

const updateFaculty = async (req, res, next) => {
    try {
        // TODO: Update faculty
        res.status(200).json({ success: true, message: 'Faculty updated' });
    } catch (error) {
        next(error);
    }
};

const deleteFaculty = async (req, res, next) => {
    try {
        // TODO: Delete faculty
        res.status(200).json({ success: true, message: 'Faculty deleted' });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getFaculties,
    createFaculty,
    updateFaculty,
    deleteFaculty
};
