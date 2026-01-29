import { Section } from '@react-email/components';

interface CardProps {
  children: React.ReactNode;
}

export const Card = ({ children }: CardProps) => {
  return (
    <Section style={card}>
      {children}
    </Section>
  );
};
const card = {
  backgroundColor: '#fff7ed',
  border: '1px solid #fdba74',
  borderRadius: '8px',
  padding: '16px',
  margin: '20px 0',
};
