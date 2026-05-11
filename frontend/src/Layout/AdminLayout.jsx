import React from 'react';
import RoleLayout from './RoleLayout';

export default function AdminLayout({ children }) {
  return <RoleLayout role="admin">{children}</RoleLayout>;
}
