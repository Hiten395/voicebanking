import { IoBackspaceOutline } from 'react-icons/io5';
import './Numpad.css';

const Numpad = ({ value, onChange, maxLength = 4, onComplete }) => {
  const handlePress = (digit) => {
    if (value.length < maxLength) {
      const newValue = value + digit;
      onChange(newValue);
      if (newValue.length === maxLength && onComplete) {
        onComplete(newValue);
      }
    }
  };

  const handleBackspace = () => {
    onChange(value.slice(0, -1));
  };

  const dots = Array.from({ length: maxLength }, (_, i) => (
    <div key={i} className={`pin-dot ${i < value.length ? 'filled' : ''}`} aria-hidden="true" />
  ));

  return (
    <div className="numpad-wrapper">
      <div className="pin-dots" role="status" aria-label={`${value.length} of ${maxLength} digits entered`}>
        {dots}
      </div>
      <div className="numpad-grid" role="group" aria-label="Number pad">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
          <button
            key={digit}
            type="button"
            className="numpad-key"
            onClick={() => handlePress(String(digit))}
            aria-label={String(digit)}
          >
            {digit}
          </button>
        ))}
        <div className="numpad-key empty" aria-hidden="true" />
        <button
          type="button"
          className="numpad-key"
          onClick={() => handlePress('0')}
          aria-label="0"
        >
          0
        </button>
        <button
          type="button"
          className="numpad-key"
          onClick={handleBackspace}
          aria-label="Backspace"
        >
          <IoBackspaceOutline size={24} />
        </button>
      </div>
    </div>
  );
};

export default Numpad;
