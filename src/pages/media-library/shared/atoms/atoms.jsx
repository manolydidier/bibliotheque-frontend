import { cls } from '../utils/format';

export const Toggle = ({ on, setOn }) => {
  return (
    <button
      type="button"
      className={cls(
        'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
        on ? 'bg-blue-600' : 'bg-gray-200'
      )}
      onClick={() => setOn(!on)}
    >
      <span
        className={cls(
          'pointer-events-none relative inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
          on ? 'translate-x-5' : 'translate-x-0'
        )}
      >
        <span
          className={cls(
            'absolute inset-0 flex h-full w-full items-center justify-center transition-opacity',
            on ? 'opacity-0 duration-100 ease-out' : 'opacity-100 duration-200 ease-in'
          )}
        >
          <svg className="h-3 w-3 text-gray-400" fill="none" viewBox="0 0 12 12">
            <path
              d="M4 8l2-2m0 0l2-2M6 6L4 4m2 2l2 2"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <span
          className={cls(
            'absolute inset-0 flex h-full w-full items-center justify-center transition-opacity',
            on ? 'opacity-100 duration-200 ease-in' : 'opacity-0 duration-100 ease-out'
          )}
        >
          <svg className="h-3 w-3 text-blue-600" fill="currentColor" viewBox="0 0 12 12">
            <path d="M3.707 5.293a1 1 0 00-1.414 1.414l1.414-1.414zM5 8l-.707.707a1 1 0 001.414 0L5 8zm4.707-3.293a1 1 0 00-1.414-1.414l1.414 1.414zm-7.414 2l2 2 1.414-1.414-2-2-1.414 1.414zm3.414 2l4-4-1.414-1.414-4 4 1.414 1.414z" />
          </svg>
        </span>
      </span>
    </button>
  );
};

export const SortIcon = ({ state }) => {
  return (
    <span className="inline-block ml-1">
      {state === 'asc' && '↑'}
      {state === 'desc' && '↓'}
    </span>
  );
};

export const TypeBadge = ({ type }) => {
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
      {type}
    </span>
  );
};

export const FileGlyph = ({ type, size = 24 }) => {
  const getIcon = () => {
    if (type.includes('pdf')) return '📄';
    if (type.includes('image')) return '🖼️';
    if (type.includes('video')) return '🎬';
    if (type.includes('audio')) return '🎵';
    if (type.includes('zip')) return '📦';
    return '📄';
  };
  
  return (
    <span style={{ fontSize: size }}>{getIcon()}</span>
  );
};