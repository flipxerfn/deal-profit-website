import { useState, useRef, useEffect } from 'react';
import { clsx } from 'clsx';

export function Tabs({ defaultValue, onValueChange, className = '', children, ...props }) {
  const [value, setValue] = useState(defaultValue);
  const tabsRef = useRef(null);
  const indicatorRef = useRef(null);

  const handleChange = (newValue) => {
    setValue(newValue);
    onValueChange?.(newValue);
  };

  useEffect(() => {
    if (indicatorRef.current && tabsRef.current) {
      const activeTab = tabsRef.current.querySelector('[data-state="active"]');
      if (activeTab) {
        indicatorRef.current.style.width = `${activeTab.offsetWidth}px`;
        indicatorRef.current.style.transform = `translateX(${activeTab.offsetLeft}px)`;
      }
    }
  }, [value]);

  return (
    <div className={clsx('w-full', className)} {...props}>
      <div className="relative" role="tablist">
        <div ref={tabsRef} className="flex gap-1 bg-charcoal/50 p-1 rounded-lg border border-white/10">
          {React.Children.map(children, (child) => {
            if (!React.isValidElement(child)) return null;
            if (child.type !== TabsTrigger) return child;
            
            return React.cloneElement(child, {
              isActive: child.props.value === value,
              onClick: () => handleChange(child.props.value),
            });
          })}
          <div
            ref={indicatorRef}
            className="absolute top-1 bottom-1 bg-brand rounded-md transition-all duration-200 ease-out pointer-events-none"
            style={{ width: 0, transform: 'translateX(0)' }}
          />
        </div>
      </div>
      <div className="mt-4">
        {React.Children.map(children, (child) => {
          if (!React.isValidElement(child)) return null;
          if (child.type !== TabsContent) return null;
          
          return React.cloneElement(child, {
            isActive: child.props.value === value,
          });
        })}
      </div>
    </div>
  );
}

export function TabsList({ className = '', children, ...props }) {
  return (
    <div className={clsx('flex gap-1', className)} role="tablist" {...props}>
      {children}
    </div>
  );
}

export function TabsTrigger({ value, isActive, onClick, className = '', children, ...props }) {
  return (
    <button
      role="tab"
      aria-selected={isActive}
      data-state={isActive ? 'active' : 'inactive'}
      onClick={onClick}
      className={clsx(
        'relative z-10 flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/70 focus-visible:ring-offset-2 focus-visible:ring-offset-night',
        isActive
          ? 'text-white shadow-sm'
          : 'text-zinc-400 hover:text-zinc-200'
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function TabsContent({ value, isActive, className = '', children, ...props }) {
  if (!isActive) return null;
  
  return (
    <div role="tabpanel" className={clsx('animate-fade-in', className)} {...props}>
      {children}
    </div>
  );
}

TabsTrigger.displayName = 'TabsTrigger';
TabsContent.displayName = 'TabsContent';

export default Tabs;