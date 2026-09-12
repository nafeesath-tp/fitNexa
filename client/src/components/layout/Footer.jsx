import React from 'react';
import { Link } from 'react-router-dom';
import { Activity } from 'lucide-react';
import { Container } from '../ui/LayoutComponents';

const Footer = () => {
  return (
    <footer className="w-full bg-[#0b120f] border-t border-[#1a3a2e] py-6 mt-auto">
      <Container className="flex flex-col md:flex-row justify-between items-center gap-6">
        
        {/* Logo */}
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-emerald-500" />
          <span className="text-white font-bold text-lg tracking-tight">FitNexa</span>
        </div>

        {/* Links */}
        <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-400 font-medium">
          <Link to="#" className="hover:text-emerald-400 transition-colors">Privacy Policy</Link>
          <Link to="#" className="hover:text-emerald-400 transition-colors">Terms of Service</Link>
          <Link to="#" className="hover:text-emerald-400 transition-colors">Contact Support</Link>
        </div>

        {/* Copyright */}
        <div className="text-sm text-gray-500 font-medium">
          © {new Date().getFullYear()} FitNexa Inc.
        </div>
      </Container>
    </footer>
  );
};

export default Footer;
