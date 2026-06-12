import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../context/AuthContext";
import { 
  useUserAddresses, useUserOrders, useUserWishlistDetails,
  addAddress, updateAddress, deleteAddress, setDefaultAddress,
  formatPrice, toggleWishlist
} from "../lib/api";
import ProductCard from "../components/ProductCard";
import { Package, Heart, MapPin, User as UserIcon, LogOut, Plus, Edit2, Trash2, Star } from "lucide-react";

function AddressManager({ user }) {
  const { data: addresses, isLoading } = useUserAddresses(user?.id);
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [currentAddress, setCurrentAddress] = useState(null);

  const emptyAddress = {
    label: "Home",
    address_line_1: "",
    address_line_2: "",
    city: "",
    state: "",
    postal_code: "",
    country: "IN",
    is_default: false
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const data = { ...currentAddress, user_id: user.id };
      if (data.id) {
        await updateAddress(data.id, data);
      } else {
        await addAddress(data);
      }
      queryClient.invalidateQueries(["addresses", user.id]);
      setIsEditing(false);
      setCurrentAddress(null);
    } catch (err) {
      console.error(err);
      alert("Failed to save address");
    }
  };

  const handleDelete = async (id) => {
    if (confirm("Are you sure you want to delete this address?")) {
      try {
        await deleteAddress(id);
        queryClient.invalidateQueries(["addresses", user.id]);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleSetDefault = async (id) => {
    try {
      await setDefaultAddress(user.id, id);
      queryClient.invalidateQueries(["addresses", user.id]);
    } catch (err) {
      console.error(err);
    }
  };

  if (isLoading) return <div className="animate-pulse bg-smoke h-40 w-full" />;

  if (isEditing) {
    return (
      <div className="bg-smoke p-6 border border-line">
        <h3 className="text-lg font-medium mb-4">{currentAddress.id ? "Edit Address" : "New Address"}</h3>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-ash mb-1">Label</label>
              <input type="text" value={currentAddress.label || ""} onChange={e => setCurrentAddress({...currentAddress, label: e.target.value})} className="w-full border border-line p-2 bg-transparent text-sm" placeholder="Home, Work..." required />
            </div>
            <div>
              <label className="block text-xs text-ash mb-1">Postal Code</label>
              <input type="text" value={currentAddress.postal_code || ""} onChange={e => setCurrentAddress({...currentAddress, postal_code: e.target.value})} className="w-full border border-line p-2 bg-transparent text-sm" required />
            </div>
          </div>
          <div>
            <label className="block text-xs text-ash mb-1">Address Line 1</label>
            <input type="text" value={currentAddress.address_line_1 || ""} onChange={e => setCurrentAddress({...currentAddress, address_line_1: e.target.value})} className="w-full border border-line p-2 bg-transparent text-sm" required />
          </div>
          <div>
            <label className="block text-xs text-ash mb-1">Address Line 2 (Optional)</label>
            <input type="text" value={currentAddress.address_line_2 || ""} onChange={e => setCurrentAddress({...currentAddress, address_line_2: e.target.value})} className="w-full border border-line p-2 bg-transparent text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-ash mb-1">City</label>
              <input type="text" value={currentAddress.city || ""} onChange={e => setCurrentAddress({...currentAddress, city: e.target.value})} className="w-full border border-line p-2 bg-transparent text-sm" required />
            </div>
            <div>
              <label className="block text-xs text-ash mb-1">State</label>
              <input type="text" value={currentAddress.state || ""} onChange={e => setCurrentAddress({...currentAddress, state: e.target.value})} className="w-full border border-line p-2 bg-transparent text-sm" required />
            </div>
          </div>
          <div className="flex items-center gap-2 mt-4">
            <input type="checkbox" id="is_default" checked={currentAddress.is_default || false} onChange={e => setCurrentAddress({...currentAddress, is_default: e.target.checked})} className="accent-ink" />
            <label htmlFor="is_default" className="text-sm">Set as default shipping address</label>
          </div>
          <div className="flex gap-4 pt-4 border-t border-line">
            <button type="submit" className="bg-ink text-smoke px-6 py-2 text-sm font-medium hover:bg-[#262626]">Save Address</button>
            <button type="button" onClick={() => setIsEditing(false)} className="border border-line px-6 py-2 text-sm hover:bg-line transition-colors">Cancel</button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-medium">Saved Addresses</h3>
        <button onClick={() => { setCurrentAddress(emptyAddress); setIsEditing(true); }} className="flex items-center gap-2 text-sm border border-line px-4 py-2 hover:bg-smoke transition-colors">
          <Plus className="w-4 h-4" /> Add New
        </button>
      </div>
      
      {addresses?.length === 0 ? (
        <p className="text-ash">You have no saved addresses.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {addresses.map(addr => (
            <div key={addr.id} className="border border-line p-6 relative group bg-white hover:border-gray-400 transition-colors">
              {addr.is_default && (
                <span className="absolute top-4 right-4 text-xs bg-ink text-smoke px-2 py-1">Default</span>
              )}
              <h4 className="font-medium text-lg mb-1">{addr.label}</h4>
              <p className="text-ash text-sm mb-4 leading-relaxed">
                {addr.address_line_1} <br/>
                {addr.address_line_2 && <>{addr.address_line_2}<br/></>}
                {addr.city}, {addr.state} {addr.postal_code} <br/>
                {addr.country}
              </p>
              <div className="flex gap-4 pt-4 border-t border-line text-sm">
                <button onClick={() => { setCurrentAddress(addr); setIsEditing(true); }} className="flex items-center gap-1 hover:text-ash transition-colors">
                  <Edit2 className="w-4 h-4" /> Edit
                </button>
                <button onClick={() => handleDelete(addr.id)} className="flex items-center gap-1 text-red-500 hover:text-red-400 transition-colors">
                  <Trash2 className="w-4 h-4" /> Delete
                </button>
                {!addr.is_default && (
                  <button onClick={() => handleSetDefault(addr.id)} className="ml-auto underline text-ash hover:text-ink transition-colors">
                    Set as default
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function OrdersList({ user }) {
  const { data: orders, isLoading } = useUserOrders(user?.id);

  if (isLoading) return <div className="animate-pulse bg-smoke h-40 w-full" />;

  if (!orders || orders.length === 0) {
    return <p className="text-ash">You have no orders yet.</p>;
  }

  return (
    <div className="space-y-6">
      {orders.map(order => (
        <div key={order.id} className="border border-line">
          <div className="bg-smoke p-4 flex flex-wrap gap-6 justify-between items-center border-b border-line text-sm">
            <div>
              <p className="text-ash text-xs uppercase tracking-wider mb-1">Order Placed</p>
              <p className="font-medium">{new Date(order.created_at).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-ash text-xs uppercase tracking-wider mb-1">Total</p>
              <p className="font-medium">{formatPrice(order.total_amount)}</p>
            </div>
            <div>
              <p className="text-ash text-xs uppercase tracking-wider mb-1">Order #</p>
              <p className="font-medium">{order.order_number || order.id.slice(0,8)}</p>
            </div>
            <div>
              <span className={`px-3 py-1 text-xs font-medium ${
                order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                order.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                'bg-gray-200 text-gray-800'
              }`}>
                {order.status.toUpperCase()}
              </span>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {order.order_items?.map(item => (
                <div key={item.id} className="flex gap-4">
                  {item.product_image && (
                    <img src={item.product_image} alt={item.product_name} className="w-16 h-20 object-cover bg-bone" />
                  )}
                  <div>
                    <p className="font-medium text-ink">{item.product_name}</p>
                    <p className="text-sm text-ash mt-1">Size: {item.size} {item.color ? `| Color: ${item.color}` : ''}</p>
                    <p className="text-sm text-ash mt-1">Qty: {item.quantity}</p>
                  </div>
                  <div className="ml-auto font-medium">
                    {formatPrice(item.price_at_purchase * item.quantity)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function WishlistList({ user }) {
  const { data: products, isLoading } = useUserWishlistDetails(user?.id);

  if (isLoading) return <div className="grid grid-cols-2 md:grid-cols-4 gap-6"><div className="animate-pulse bg-smoke aspect-[3/4] w-full" /></div>;

  if (!products || products.length === 0) {
    return <p className="text-ash">Your wishlist is empty.</p>;
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
      {products.map(p => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}

export default function Account() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("orders");

  if (!user) {
    return (
      <div className="pt-32 text-center min-h-[60vh]">
        <h2 className="text-2xl font-serif">Please log in to view your account</h2>
        <button onClick={() => navigate("/")} className="mt-4 underline text-ash">Return Home</button>
      </div>
    );
  }

  const tabs = [
    { id: "orders", label: "Orders", icon: Package },
    { id: "wishlist", label: "Wishlist", icon: Heart },
    { id: "addresses", label: "Addresses", icon: MapPin },
    { id: "profile", label: "Profile", icon: UserIcon },
  ];

  return (
    <div className="pt-28 px-4 sm:px-6 md:px-12 max-w-[1200px] mx-auto min-h-screen pb-20">
      <div className="flex justify-between items-end mb-10">
        <div>
          <h1 className="text-3xl font-serif mb-2">My Account</h1>
          <p className="text-ash">Welcome back, {user.user_metadata?.full_name || user.email}</p>
        </div>
        <button onClick={() => { signOut(); navigate("/"); }} className="flex items-center gap-2 text-sm text-ash hover:text-ink transition-colors">
          <LogOut className="w-4 h-4" /> Sign Out
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-10">
        {/* Sidebar Nav */}
        <div className="w-full md:w-64 flex-shrink-0 space-y-1">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${
                  isActive ? "bg-smoke text-ink" : "text-ash hover:bg-gray-50 hover:text-ink"
                }`}
              >
                <Icon className="w-4 h-4" /> {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content Area */}
        <div className="flex-1">
          {activeTab === "orders" && <OrdersList user={user} />}
          {activeTab === "wishlist" && <WishlistList user={user} />}
          {activeTab === "addresses" && <AddressManager user={user} />}
          {activeTab === "profile" && (
            <div className="bg-smoke p-6 border border-line">
              <h3 className="text-lg font-medium mb-6">Profile Details</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-ash mb-1">Full Name</label>
                  <p className="font-medium">{user.user_metadata?.full_name || "Not provided"}</p>
                </div>
                <div>
                  <label className="block text-xs text-ash mb-1">Email Address</label>
                  <p className="font-medium">{user.email}</p>
                </div>
                <div>
                  <label className="block text-xs text-ash mb-1">Phone Number</label>
                  <p className="font-medium">{user.phone_number || "Not provided"}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
