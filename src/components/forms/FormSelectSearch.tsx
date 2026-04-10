'use client';

import React from 'react';
import { FaCheck } from 'react-icons/fa6';
import Select, { MultiValue, SingleValue } from 'react-select';

export interface SelectOption {
  value: string | number;
  label: string;
}

export interface FormSelectSearchProps<T = SelectOption> {
  value?: T | T[];
  onChange: (value: T | T[]) => void;
  options: T[];
  placeholder?: string;
  isDisabled?: boolean;
  isLoading?: boolean;
  isClearable?: boolean;
  isRtl?: boolean;
  isSearchable?: boolean;
  name?: string;
  className?: string;
  classNamePrefix?: string;
  variantType?: 'default' | 'filter';
  hideSelectedOptions?: boolean;
  multi?: boolean;
  height?: string;
  width?: string;
  fontSize?: string;
  formatOptionLabel?: (option: T, context: { context: 'menu' | 'value' }) => React.ReactNode;
  isOptionSelected?: (option: T) => boolean;
  getOptionLabel?: (option: T) => string;
  filterOption?: (
    option: { data: T; label: string; value: string | number },
    inputValue: string
  ) => boolean;
  noOptionsMessage?: (obj: { inputValue: string }) => React.ReactNode;
  onInputChange?: (newValue: string, actionMeta: { action: string }) => void;
  onMenuOpen?: () => void;
  onMenuClose?: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  components?: Record<string, React.ComponentType<any>>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  selectProps?: Record<string, any>;
}

export const FormSelectSearch = <T extends SelectOption>({
  value,
  onChange,
  options,
  placeholder = 'Select options...',
  isDisabled = false,
  isLoading = false,
  isClearable = true,
  isRtl = false,
  isSearchable = true,
  name,
  className = 'basic-select',
  classNamePrefix = 'select',
  variantType = 'default',
  hideSelectedOptions = false,
  multi = false,
  height = '50px',
  width = '100%',
  fontSize = '16px',
  formatOptionLabel,
  isOptionSelected,
  getOptionLabel,
  filterOption,
  noOptionsMessage,
  onInputChange,
  onMenuOpen,
  onMenuClose,
  components,
  selectProps,
}: FormSelectSearchProps<T>) => {
  /* Chakra UI colors
		primary.200: #ff7b424d
		primary.500: #ff7b42
		layoutBg.500: #f7f6f4
		gray.200: #e4e4e7
		paginationBg.500: #f0efea
	*/

  const variantStyles = {
    default: {
      bg: '#f7f6f4',
      border: '1px solid',
      borderColor: '#e4e4e7',
    },
    filter: {
      bg: '#f0efea',
      border: 'none',
      borderColor: 'transparent',
    },
  };

  const style = variantStyles[variantType];

  const handleChange = (newValue: MultiValue<T> | SingleValue<T>) => {
    if (multi) {
      onChange([...(newValue as MultiValue<T>)]);
    } else {
      onChange(newValue as T);
    }
  };

  const defaultIsOptionSelected = (option: T) => {
    if (multi) {
      return Array.isArray(value) && value.some(selected => selected.value === option.value);
    } else {
      return !Array.isArray(value) && value?.value === option.value;
    }
  };

  const defaultFormatOptionLabel = (option: T, { context }: { context: 'menu' | 'value' }) => {
    if (context === 'menu' && multi) {
      const selected = isOptionSelected
        ? isOptionSelected(option)
        : defaultIsOptionSelected(option);
      return (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ width: '20px', display: 'flex', justifyContent: 'center' }}>
            {selected && <FaCheck style={{ color: '#ff7b42', fontSize: '14px' }} />}
          </div>
          <span style={{ marginLeft: '6px' }}>{option.label}</span>
        </div>
      );
    }
    return option.label;
  };

  return (
    <Select
      className={className}
      classNamePrefix={classNamePrefix}
      isMulti={multi}
      value={value}
      onChange={handleChange}
      isDisabled={isDisabled}
      isLoading={isLoading}
      isClearable={isClearable}
      isRtl={isRtl}
      isSearchable={isSearchable}
      name={name}
      options={options}
      placeholder={placeholder}
      hideSelectedOptions={hideSelectedOptions}
      closeMenuOnSelect={!multi}
      formatOptionLabel={formatOptionLabel || defaultFormatOptionLabel}
      getOptionLabel={getOptionLabel}
      filterOption={filterOption}
      noOptionsMessage={noOptionsMessage}
      onInputChange={onInputChange}
      onMenuOpen={onMenuOpen}
      onMenuClose={onMenuClose}
      components={components}
      {...selectProps}
      styles={{
        control: baseStyles => ({
          ...baseStyles,
          minHeight: height,
          width: width,
          backgroundColor: style.bg,
          border: style.border,
          borderColor: `${style.borderColor} !important`,
          borderRadius: '8px',
          boxShadow: 'none',
          fontSize: fontSize,
          '&:hover': {
            borderColor: style.borderColor,
          },
        }),
        multiValue: baseStyles => ({
          ...baseStyles,
          backgroundColor: '#ff7b424d',
          color: '#191d26',
          borderRadius: '4px',
        }),
        multiValueLabel: baseStyles => ({
          ...baseStyles,
          color: '#191d26',
          fontSize: '14px',
        }),
        multiValueRemove: baseStyles => ({
          ...baseStyles,
          color: '#191d26',
          '&:hover': {
            backgroundColor: '#ff7b424d',
            color: '#191d26',
          },
        }),
        singleValue: baseStyles => ({
          ...baseStyles,
          color: '#191d26',
          fontSize: fontSize,
        }),
        menu: baseStyles => ({
          ...baseStyles,
          boxShadow: 'none',
          border: `1px solid #e4e4e7`,
          marginTop: '0',
        }),
        option: (baseStyles, state) => ({
          ...baseStyles,
          backgroundColor: state.isSelected ? 'white' : state.isFocused ? '#ff7b424d' : 'white',
          color: '#191d26',
          '&:hover': {
            backgroundColor: '#ff7b424d',
          },
        }),
      }}
    />
  );
};
