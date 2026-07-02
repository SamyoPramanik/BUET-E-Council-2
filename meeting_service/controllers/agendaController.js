const CustomError = require('../errors/CustomError');

const getAgendams = async (req, res, next) => {
    try {
        res.status(200).json({ success: true, data: [] });
    } catch (error) {
        next(error);
    }
};

const createAgendam = async (req, res, next) => {
    try {
        res.status(201).json({ success: true, message: 'Agendam created' });
    } catch (error) {
        next(error);
    }
};

const updateAgendam = async (req, res, next) => {
    try {
        res.status(200).json({ success: true, message: 'Agendam updated' });
    } catch (error) {
        next(error);
    }
};

const deleteAgendam = async (req, res, next) => {
    try {
        res.status(200).json({ success: true, message: 'Agendam deleted' });
    } catch (error) {
        next(error);
    }
};

const getResolutions = async (req, res, next) => {
    try {
        res.status(200).json({ success: true, data: [] });
    } catch (error) {
        next(error);
    }
};

const createResolution = async (req, res, next) => {
    try {
        res.status(201).json({ success: true, message: 'Resolution created' });
    } catch (error) {
        next(error);
    }
};

const updateResolution = async (req, res, next) => {
    try {
        res.status(200).json({ success: true, message: 'Resolution updated' });
    } catch (error) {
        next(error);
    }
};

const deleteResolution = async (req, res, next) => {
    try {
        res.status(200).json({ success: true, message: 'Resolution deleted' });
    } catch (error) {
        next(error);
    }
};

const addAnnexures = async (req, res, next) => {
    try {
        // files will be uploaded using utilsFunctions (multer+S3)
        res.status(200).json({ success: true, message: 'Annexures added' });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getAgendams,
    createAgendam,
    updateAgendam,
    deleteAgendam,
    getResolutions,
    createResolution,
    updateResolution,
    deleteResolution,
    addAnnexures
};
