import { useState } from 'react';
import { api } from '@/App';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

const Profile = ({ user, setUser }) => {
  const [editMode, setEditMode] = useState(false);
  const [profileData, setProfileData] = useState({
    name: user.name,
    phone: user.phone
  });
  const [showAddressDialog, setShowAddressDialog] = useState(false);
  const [newAddress, setNewAddress] = useState({
    full_name: user.name,
    phone: user.phone,
    address_line: '',
    city: '',
    state: '',
    pincode: '',
    is_default: false
  });

  const updateProfile = async (e) => {
    e.preventDefault();
    try {
      await api.put('/auth/profile', profileData);
      setUser({ ...user, ...profileData });
      toast.success('Profile updated!');
      setEditMode(false);
    } catch (error) {
      toast.error('Failed to update profile');
    }
  };

  const addAddress = async (e) => {
    e.preventDefault();
    try {
      await api.post('/auth/address', newAddress);
      toast.success('Address added!');
      setShowAddressDialog(false);
      
      // Refresh user data
      const response = await api.get('/auth/profile');
      setUser(response.data);
      
      setNewAddress({
        full_name: user.name,
        phone: user.phone,
        address_line: '',
        city: '',
        state: '',
        pincode: '',
        is_default: false
      });
    } catch (error) {
      toast.error('Failed to add address');
    }
  };

  const deleteAddress = async (addressId) => {
    try {
      await api.delete(`/auth/address/${addressId}`);
      toast.success('Address deleted!');
      
      // Refresh user data
      const response = await api.get('/auth/profile');
      setUser(response.data);
    } catch (error) {
      toast.error('Failed to delete address');
    }
  };

  return (
    <div data-testid="profile-page" className="min-h-screen py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">My Profile</h1>

        <div className="space-y-6">
          {/* Profile Information */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Profile Information</CardTitle>
                {!editMode && (
                  <Button data-testid="edit-profile-btn" variant="outline" onClick={() => setEditMode(true)}>
                    Edit
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {editMode ? (
                <form onSubmit={updateProfile} data-testid="profile-form" className="space-y-4">
                  <div>
                    <Label>Name</Label>
                    <Input
                      data-testid="profile-name"
                      value={profileData.name}
                      onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <Input
                      data-testid="profile-phone"
                      value={profileData.phone}
                      onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input value={user.email} disabled />
                  </div>
                  <div className="flex gap-3">
                    <Button data-testid="save-profile-btn" type="submit">Save Changes</Button>
                    <Button
                      data-testid="cancel-edit-btn"
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setEditMode(false);
                        setProfileData({ name: user.name, phone: user.phone });
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-600">Name</p>
                    <p data-testid="display-name" className="font-medium">{user.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Email</p>
                    <p data-testid="display-email" className="font-medium">{user.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Phone</p>
                    <p data-testid="display-phone" className="font-medium">{user.phone}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Saved Addresses */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Saved Addresses</CardTitle>
                <Dialog open={showAddressDialog} onOpenChange={setShowAddressDialog}>
                  <DialogTrigger asChild>
                    <Button data-testid="add-address-profile-btn" variant="outline">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Address
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New Address</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={addAddress} data-testid="address-form-profile" className="space-y-4">
                      <div>
                        <Label>Full Name</Label>
                        <Input
                          data-testid="address-fullname"
                          required
                          value={newAddress.full_name}
                          onChange={(e) => setNewAddress({ ...newAddress, full_name: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>Phone</Label>
                        <Input
                          data-testid="address-phone-profile"
                          required
                          value={newAddress.phone}
                          onChange={(e) => setNewAddress({ ...newAddress, phone: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>Address</Label>
                        <Input
                          data-testid="address-line-profile"
                          required
                          value={newAddress.address_line}
                          onChange={(e) => setNewAddress({ ...newAddress, address_line: e.target.value })}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>City</Label>
                          <Input
                            data-testid="address-city-profile"
                            required
                            value={newAddress.city}
                            onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label>State</Label>
                          <Input
                            data-testid="address-state-profile"
                            required
                            value={newAddress.state}
                            onChange={(e) => setNewAddress({ ...newAddress, state: e.target.value })}
                          />
                        </div>
                      </div>
                      <div>
                        <Label>Pincode</Label>
                        <Input
                          data-testid="address-pincode-profile"
                          required
                          value={newAddress.pincode}
                          onChange={(e) => setNewAddress({ ...newAddress, pincode: e.target.value })}
                        />
                      </div>
                      <Button data-testid="save-address-profile-btn" type="submit" className="w-full">
                        Save Address
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {user.addresses?.length === 0 ? (
                <p data-testid="no-addresses-profile" className="text-gray-600">No saved addresses</p>
              ) : (
                <div data-testid="addresses-list" className="space-y-4">
                  {user.addresses?.map((addr) => (
                    <div
                      key={addr.id}
                      data-testid={`address-card-${addr.id}`}
                      className="p-4 border border-gray-200 rounded-lg flex justify-between items-start"
                    >
                      <div>
                        <p className="font-semibold">{addr.full_name}</p>
                        <p className="text-sm text-gray-600">{addr.address_line}</p>
                        <p className="text-sm text-gray-600">{addr.city}, {addr.state} - {addr.pincode}</p>
                        <p className="text-sm text-gray-600">Phone: {addr.phone}</p>
                        {addr.is_default && (
                          <span className="inline-block mt-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                            Default
                          </span>
                        )}
                      </div>
                      <Button
                        data-testid={`delete-address-${addr.id}`}
                        variant="ghost"
                        size="icon"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => deleteAddress(addr.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Profile;
