/**
 * Date utility functions for consistent date handling across the app
 */

/**
 * Formats a date to YYYY-MM-DD format
 * @param date - Date object to format
 * @returns formatted date string
 */
export const formatDate = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };
  
  /**
   * Gets the current date in YYYY-MM-DD format
   * @returns today's date as string
   */
  export const getCurrentDate = (): string => {
    return formatDate(new Date());
  };
  
  /**
   * Formats a date to a readable string (e.g., "March 31, 2025")
   * @param date - Date object to format
   * @returns formatted date string
   */
  export const formatReadableDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };
  
  /**
   * Formats time to HH:MM format
   * @param date - Date object to format
   * @returns formatted time string
   */
  export const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };
  
  /**
   * Checks if two dates are the same day
   * @param date1 - First date to compare
   * @param date2 - Second date to compare
   * @returns boolean indicating if dates are the same day
   */
  export const isSameDay = (date1: Date, date2: Date): boolean => {
    return formatDate(date1) === formatDate(date2);
  };
  
  /**
   * Gets the start of the current day
   * @returns Date object set to start of current day
   */
  export const getStartOfDay = (): Date => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  };
  
  /**
   * Gets the end of the current day
   * @returns Date object set to end of current day
   */
  export const getEndOfDay = (): Date => {
    const date = new Date();
    date.setHours(23, 59, 59, 999);
    return date;
  };
  
  /**
   * Validates if a string is in YYYY-MM-DD format
   * @param dateString - String to validate
   * @returns boolean indicating if string is valid date format
   */
  export const isValidDateFormat = (dateString: string): boolean => {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    return regex.test(dateString);
  };