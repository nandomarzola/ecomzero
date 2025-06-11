import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  required?: boolean;
  description?: string;
}

const Input: React.FC<InputProps> = ({ label, required = false, description, ...props }) => {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-600 ml-1">*</span>}
      </label>
      {description && (
        <p className="text-xs text-gray-500 mb-1">
          {description}
        </p>
      )}
      <input
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-800 focus:border-red-800 transition"
        {...props}
      />
    </div>
  );
};

export default Input;
