import { useState } from 'react'
 
interface PasswordInputProps {
  id?: string
  label: string
  value: string
  onChange: (value: string) => void
  required?: boolean
  placeholder?: string
  autoComplete?: string
}
 
/**
 * PasswordInput: a password field with a show/hide toggle (eye icon), so
 * users can double-check what they typed instead of having to trust a row
 * of dots. Reused everywhere a password is entered (login, profile) so the
 * toggle behavior only needs to be built once.
 */
function PasswordInput({ id, label, value, onChange, required, placeholder, autoComplete }: PasswordInputProps) {
  const [isVisible, setIsVisible] = useState(false)
 
  return (
    <div className="field-row">
      <label htmlFor={id}>{label}</label>
      <div style={{ position: 'relative' }}>
        <input
          id={id}
          type={isVisible ? 'text' : 'password'}
          value={value}
          required={required}
          placeholder={placeholder}
          autoComplete={autoComplete}
          onChange={(e) => onChange(e.target.value)}
          style={{ width: '100%', paddingRight: '40px' }}
        />
        <button
          type="button"
          onClick={() => setIsVisible((prev) => !prev)}
          aria-label={isVisible ? 'Passwort verbergen' : 'Passwort anzeigen'}
          style={{
            position: 'absolute',
            right: '10px',
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '15px',
            color: 'var(--muted)',
            padding: '4px',
          }}
        >
          {isVisible ? '🙈' : '👁️'}
        </button>
      </div>
    </div>
  )
}
 
export default PasswordInput
 
