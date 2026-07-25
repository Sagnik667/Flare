import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useGetContactsQuery, useCreateContactMutation, useUpdateContactMutation, useDeleteContactMutation } from '../store/api/contactsApi';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import { PhoneCall, Plus, Trash2, Edit2, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';

const contactSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  relationship: z.string().min(2, 'Relationship must be at least 2 characters'),
  phone: z.string().min(10, 'Phone number must be at least 10 digits'),
  email: z.string().email('Please enter a valid email address').optional().or(z.literal('')),
});

export const EmergencyContacts = () => {
  const { data: contactsRes, isLoading, refetch } = useGetContactsQuery();
  const [createContact, { isLoading: isCreating }] = useCreateContactMutation();
  const [updateContact, { isLoading: isUpdating }] = useUpdateContactMutation();
  const [deleteContact, { isLoading: isDeleting }] = useDeleteContactMutation();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState(null);

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(contactSchema),
    defaultValues: { name: '', relationship: '', phone: '', email: '' },
  });

  const contacts = contactsRes?.data || [];

  const handleOpenAddModal = () => {
    setEditingContact(null);
    reset({ name: '', relationship: '', phone: '', email: '' });
    setModalOpen(true);
  };

  const handleOpenEditModal = (contact) => {
    setEditingContact(contact);
    setValue('name', contact.name);
    setValue('relationship', contact.relationship);
    setValue('phone', contact.phone);
    setValue('email', contact.email || '');
    setModalOpen(true);
  };

  const onSubmit = async (data) => {
    try {
      if (editingContact) {
        await updateContact({ id: editingContact.id, ...data }).unwrap();
        toast.success('Emergency contact updated successfully');
      } else {
        if (contacts.length >= 5) {
          toast.error('You can add a maximum of 5 emergency contacts');
          return;
        }
        await createContact(data).unwrap();
        toast.success('Emergency contact added successfully');
      }
      setModalOpen(false);
      refetch();
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to save contact');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this contact?')) {
      try {
        await deleteContact(id).unwrap();
        toast.success('Contact deleted successfully');
        refetch();
      } catch (err) {
        toast.error('Failed to delete contact');
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto w-full text-left py-4 flex flex-col gap-6">
      {/* Title section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">safety circle</span>
          <h2 className="text-2xl font-display font-bold text-text-primary mt-0.5">Emergency Contacts</h2>
          <p className="text-xs text-text-secondary mt-1">Manage guardians who will be notified immediately when you trigger an SOS.</p>
        </div>
        {contacts.length < 5 && (
          <Button onClick={handleOpenAddModal} icon={Plus}>
            Add Contact
          </Button>
        )}
      </div>

      {/* Grid List */}
      {isLoading ? (
        <div className="py-12 text-center text-text-secondary">Loading contacts...</div>
      ) : contacts.length === 0 ? (
        <EmptyState
          title="No Emergency Contacts Added"
          description="Add up to 5 family members, friends, or trusted guardians. They will receive automated SMS notifications during an SOS alert."
          icon={PhoneCall}
          action={
            <Button onClick={handleOpenAddModal} icon={Plus}>
              Add Your First Contact
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {contacts.map((contact) => (
            <Card key={contact.id} className="flex flex-col justify-between border-border bg-bg-surface hover:border-text-muted transition-colors">
              <div>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-text-primary text-base">{contact.name}</h3>
                    <Badge variant="primary" className="mt-1">{contact.relationship}</Badge>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleOpenEditModal(contact)}
                      className="p-1.5 rounded-lg hover:bg-bg-raised text-text-secondary hover:text-text-primary transition-colors focus:outline-none"
                      title="Edit Contact"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(contact.id)}
                      className="p-1.5 rounded-lg hover:bg-bg-raised text-text-secondary hover:text-danger transition-colors focus:outline-none"
                      title="Delete Contact"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-text-secondary">
                  <p className="flex items-center gap-2">
                    <span className="font-semibold text-text-muted w-14">Phone:</span>
                    <a href={`tel:${contact.phone}`} className="hover:underline text-text-primary font-semibold">
                      {contact.phone}
                    </a>
                  </p>
                  {contact.email && (
                    <p className="flex items-center gap-2">
                      <span className="font-semibold text-text-muted w-14">Email:</span>
                      <span className="text-text-primary">{contact.email}</span>
                    </p>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingContact ? 'Edit Contact' : 'Add Emergency Contact'}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 text-left">
          <Input
            label="Name"
            placeholder="Jane Doe"
            error={errors.name?.message}
            {...register('name')}
          />

          <Input
            label="Relationship"
            placeholder="Mother, Spouse, Friend, Guardian"
            error={errors.relationship?.message}
            {...register('relationship')}
          />

          <Input
            label="Phone Number"
            placeholder="+1234567890"
            error={errors.phone?.message}
            {...register('phone')}
          />

          <Input
            label="Email Address (Optional)"
            type="email"
            placeholder="jane@example.com"
            error={errors.email?.message}
            {...register('email')}
          />

          <div className="flex gap-3 justify-end pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isCreating || isUpdating}>
              Save Contact
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default EmergencyContacts;
