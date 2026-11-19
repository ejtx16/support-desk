import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { getInitials } from '@/lib/getInitials';
import { Button } from './Button';
import { DataTable } from './DataTable';
import { FormField } from './FormField';
import { Input } from './Input';
import { Pagination } from './Pagination';

describe('Button', () => {
  it('calls onClick', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Save</Button>);
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('is disabled and busy while loading', async () => {
    const onClick = vi.fn();
    render(
      <Button isLoading onClick={onClick}>
        Save
      </Button>,
    );
    const button = screen.getByRole('button', { name: /save/i });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('defaults to type="button" so it never submits forms by accident', () => {
    render(<Button>Click</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
  });
});

describe('FormField', () => {
  it('links the label and error message to the control', () => {
    render(
      <FormField label="Email" error="Email is required">
        <Input />
      </FormField>,
    );
    const input = screen.getByLabelText('Email');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('Email is required');
  });

  it('shows a hint when there is no error', () => {
    render(
      <FormField label="Password" hint="At least 8 characters">
        <Input />
      </FormField>,
    );
    expect(screen.getByLabelText('Password')).toHaveAccessibleDescription('At least 8 characters');
  });
});

describe('Pagination', () => {
  it('shows the current range and disables Previous on the first page', () => {
    render(<Pagination page={1} totalPages={3} total={25} pageSize={10} onPageChange={() => {}} />);
    expect(screen.getByRole('navigation')).toHaveTextContent('Showing 1–10 of 25');
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled();
  });

  it('requests the next page', async () => {
    const onPageChange = vi.fn();
    render(
      <Pagination page={2} totalPages={3} total={25} pageSize={10} onPageChange={onPageChange} />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it('renders nothing when there are no results', () => {
    const { container } = render(
      <Pagination page={1} totalPages={1} total={0} pageSize={10} onPageChange={() => {}} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});

describe('DataTable', () => {
  const rows = [
    { id: '1', name: 'Alpha' },
    { id: '2', name: 'Beta' },
  ];
  const columns = [{ key: 'name', header: 'Name', cell: (r: (typeof rows)[number]) => r.name }];

  it('renders a row per record', () => {
    render(<DataTable columns={columns} rows={rows} getRowKey={(r) => r.id} />);
    expect(screen.getAllByRole('row')).toHaveLength(3); // header + 2
    expect(screen.getByText('Beta')).toBeInTheDocument();
  });

  it('calls onRowClick with the record', async () => {
    const onRowClick = vi.fn();
    render(
      <DataTable columns={columns} rows={rows} getRowKey={(r) => r.id} onRowClick={onRowClick} />,
    );
    await userEvent.click(screen.getByText('Alpha'));
    expect(onRowClick).toHaveBeenCalledWith(rows[0]);
  });

  it('renders the empty state when there are no rows', () => {
    render(
      <DataTable columns={columns} rows={[]} getRowKey={(r) => r.id} empty={<p>Nothing here</p>} />,
    );
    expect(screen.getByText('Nothing here')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});

describe('getInitials', () => {
  it('uses up to two initials', () => {
    expect(getInitials('Casey Customer')).toBe('CC');
    expect(getInitials('Ada')).toBe('A');
    expect(getInitials('Mary Jane Watson')).toBe('MJ');
  });
});
