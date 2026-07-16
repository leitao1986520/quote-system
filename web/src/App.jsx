import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './auth.jsx';
import Layout from './Layout.jsx';
import Login from './pages/Login.jsx';
import Market from './pages/Market.jsx';
import NewInquiry from './pages/NewInquiry.jsx';
import MyInquiries from './pages/MyInquiries.jsx';
import InquiryDetail from './pages/InquiryDetail.jsx';
import MyQuotations from './pages/MyQuotations.jsx';

function RequireAuth({ children, role }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to={user?.role === 'buyer' ? '/my-inquiries' : '/market'} replace />} />
        <Route path="/market" element={<RequireAuth><Market /></RequireAuth>} />
        <Route path="/inquiry/new" element={<RequireAuth role="buyer"><NewInquiry /></RequireAuth>} />
        <Route path="/my-inquiries" element={<RequireAuth role="buyer"><MyInquiries /></RequireAuth>} />
        <Route path="/inquiry/:id" element={<RequireAuth><InquiryDetail /></RequireAuth>} />
        <Route path="/my-quotations" element={<RequireAuth role="supplier"><MyQuotations /></RequireAuth>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
