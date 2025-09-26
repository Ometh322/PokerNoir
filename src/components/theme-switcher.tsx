import React from 'react';
import { Switch, Tooltip } from '@heroui/react';
import { Icon } from '@iconify/react';
import { useTheme } from '@heroui/use-theme';

export const ThemeSwitcher: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const isDark = theme === 'dark';

  const handleToggle = () => {
    setTheme(isDark ? 'light' : 'dark');
  };

  return (
    <Tooltip content={`Переключить на ${isDark ? 'светлую' : 'темную'} тему`} placement="bottom">
      <div className="flex items-center gap-2">
        <Icon 
          icon="lucide:sun" 
          className={`text-lg ${!isDark ? 'text-warning' : 'text-default-500'}`} 
        />
        <Switch
          isSelected={isDark}
          onValueChange={handleToggle}
          size="sm"
          color="primary"
        />
        <Icon 
          icon="lucide:moon" 
          className={`text-lg ${isDark ? 'text-primary' : 'text-default-500'}`} 
        />
      </div>
    </Tooltip>
  );
};