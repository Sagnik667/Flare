import * as contactService from './emergency-contacts.service.js';
import ApiResponse from '../../utils/apiResponse.js';

export const getContacts = async (req, res) => {
  const data = await contactService.getContacts(req.user.id);
  return ApiResponse.success(res, 'Emergency contacts retrieved successfully', data);
};

export const createContact = async (req, res) => {
  const { contactName, phone, relationship, notifyOnSos } = req.body;
  const contact = await contactService.createContact(req.user.id, {
    contactName,
    phone,
    relationship,
    notifyOnSos,
  });
  return ApiResponse.success(res, 'Emergency contact added successfully', contact, 201);
};

export const updateContact = async (req, res) => {
  const { id } = req.params;
  const { contactName, phone, relationship, notifyOnSos } = req.body;
  const contact = await contactService.updateContact(req.user.id, id, {
    contactName,
    phone,
    relationship,
    notifyOnSos,
  });
  return ApiResponse.success(res, 'Emergency contact updated successfully', contact);
};

export const deleteContact = async (req, res) => {
  const { id } = req.params;
  await contactService.deleteContact(req.user.id, id);
  return ApiResponse.success(res, 'Emergency contact deleted successfully');
};

export default {
  getContacts,
  createContact,
  updateContact,
  deleteContact,
};
