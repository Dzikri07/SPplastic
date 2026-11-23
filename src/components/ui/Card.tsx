import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <div
      {...props}
      className={`bg-white border border-border rounded-md ${className}`}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <div
      {...props}
      className={`px-5 py-4 border-b border-border ${className}`}
    >
      {children}
    </div>
  );
};

export const CardBody: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <div {...props} className={`p-5 ${className}`}>
      {children}
    </div>
  );
};
