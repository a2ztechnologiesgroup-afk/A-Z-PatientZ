import type { PatientData, DoctorExcuseData, FuneralProgramData } from '../types';

type Errors<T> = Partial<Record<keyof T, string>>;

const validateRequired = (value: any, fieldName: string) => {
  if (!value || (typeof value === 'string' && !value.trim())) {
    return `${fieldName} is required.`;
  }
  return '';
};

const validateDate = (value: string, fieldName: string) => {
    if (!value) return ''; // Let required check handle empty values
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return `${fieldName} must be in YYYY-MM-DD format.`;
    }
    // Append T00:00:00 to treat the date string as local, avoiding timezone pitfalls.
    const date = new Date(value + 'T00:00:00');
    if (isNaN(date.getTime())) {
        return `${fieldName} is not a valid date.`;
    }
    
    const [year, month, day] = value.split('-').map(Number);
    // Check for invalid dates like 2023-02-30, which JS would parse as 2023-03-02
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
        return `${fieldName} contains an invalid day or month.`;
    }
    return '';
};

const validateSsnLast4 = (value: string) => {
    if (!/^\d{4}$/.test(value)) {
        return `Last 4 of SSN must be 4 digits.`;
    }
    return '';
};


export const validateDischargeSummary = (data: PatientData): Errors<PatientData> => {
    const errors: Errors<PatientData> = {};

    if (!data.firstName.trim()) errors.firstName = "First Name is required.";
    if (!data.lastName.trim()) errors.lastName = "Last Name is required.";
    
    // --- DOB Validation ---
    if (!data.dob) {
        errors.dob = "Date of Birth is required.";
    } else {
        const dobError = validateDate(data.dob, 'Date of Birth');
        if (dobError) {
            errors.dob = dobError;
        } else {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const dobDate = new Date(data.dob + 'T00:00:00');
            if (dobDate >= today) {
                errors.dob = "Date of Birth must be in the past.";
            }
        }
    }

    if (data.patientSsnLast4 && validateSsnLast4(data.patientSsnLast4)) {
        errors.patientSsnLast4 = validateSsnLast4(data.patientSsnLast4);
    }

    let intakeDate: Date | null = null;
    // --- Intake Date Validation ---
    if (!data.intake) {
        errors.intake = "Admission Date is required.";
    } else {
        const intakeError = validateDate(data.intake, 'Admission Date');
        if (intakeError) {
            errors.intake = intakeError;
        } else {
            const today = new Date();
            today.setHours(23, 59, 59, 999);
            intakeDate = new Date(data.intake + 'T00:00:00');
            if (intakeDate > today) {
                errors.intake = "Admission Date cannot be in the future.";
            }
        }
    }

    let dischargeDate: Date | null = null;
    // --- Discharge Date Validation ---
    if (!data.discharge) {
        errors.discharge = "Discharge Date is required.";
    } else {
        const dischargeError = validateDate(data.discharge, 'Discharge Date');
        if (dischargeError) {
            errors.discharge = dischargeError;
        } else {
            dischargeDate = new Date(data.discharge + 'T00:00:00');
            if (intakeDate && dischargeDate < intakeDate) {
                errors.discharge = "Discharge Date must be on or after the Admission Date.";
            }
        }
    }
    
    // --- Return to Work/School Date Validation ---
    if (data.returnToWorkSchoolDate) {
        const returnDateError = validateDate(data.returnToWorkSchoolDate, 'Return to Work/School Date');
        if (returnDateError) {
            errors.returnToWorkSchoolDate = returnDateError;
        } else {
            const returnDate = new Date(data.returnToWorkSchoolDate + 'T00:00:00');
            if (dischargeDate && returnDate < dischargeDate) {
                errors.returnToWorkSchoolDate = "Return date must be on or after the Discharge Date.";
            }
        }
    }

    if (!data.diagnosis.trim()) errors.diagnosis = "Diagnosis is required.";
    if (!data.attendingPhysician?.trim()) errors.attendingPhysician = "Attending Physician is required.";

    return errors;
};


export const validateDoctorExcuse = (data: DoctorExcuseData): Errors<DoctorExcuseData> => {
    const errors: Errors<DoctorExcuseData> = {};

    if (!data.patientFirstName.trim()) errors.patientFirstName = "Patient First Name is required.";
    if (!data.patientLastName.trim()) errors.patientLastName = "Patient Last Name is required.";
    
    let dateOfVisitDate: Date | null = null;
    if (!data.dateOfVisit) errors.dateOfVisit = "Date of Visit is required.";
    else {
      const error = validateDate(data.dateOfVisit, 'Date of Visit');
      if (error) errors.dateOfVisit = error;
      else dateOfVisitDate = new Date(data.dateOfVisit + 'T00:00:00');
    }

    let absenceStartDate: Date | null = null;
    // Absence Start Date is autofilled, but still needs validation
    if (!data.absenceStartDate) errors.absenceStartDate = "Absence Start Date is required.";
    else {
      const error = validateDate(data.absenceStartDate, 'Absence Start Date');
      if (error) errors.absenceStartDate = error;
      else {
        absenceStartDate = new Date(data.absenceStartDate + 'T00:00:00');
        if (dateOfVisitDate && absenceStartDate < dateOfVisitDate) {
            errors.absenceStartDate = "Absence Start Date cannot be before Date of Visit.";
        }
      }
    }

    let absenceEndDate: Date | null = null;
    if (!data.absenceEndDate) errors.absenceEndDate = "Absence End Date is required.";
    else {
      const error = validateDate(data.absenceEndDate, 'Absence End Date');
      if (error) errors.absenceEndDate = error;
      else {
        absenceEndDate = new Date(data.absenceEndDate + 'T00:00:00');
        if (absenceStartDate && absenceEndDate < absenceStartDate) {
            errors.absenceEndDate = "Absence End Date cannot be before Absence Start Date.";
        }
      }
    }

    let returnDate: Date | null = null;
    // Return Date is autofilled, but still needs validation
    if (!data.returnDate) errors.returnDate = "Return Date is required.";
    else {
      const error = validateDate(data.returnDate, 'Return Date');
      if (error) errors.returnDate = error;
      else {
        returnDate = new Date(data.returnDate + 'T00:00:00');
        if (absenceEndDate && returnDate <= absenceEndDate) { // Changed to 'less than or equal to'
            errors.returnDate = "Return Date must be after Absence End Date.";
        }
      }
    }

    if (!data.diagnosis.trim()) errors.diagnosis = "Diagnosis is required.";
    if (!data.attendingPhysician?.trim()) errors.attendingPhysician = "Attending Physician is required.";

    return errors;
};


export const validateFuneralProgram = (data: FuneralProgramData): Errors<FuneralProgramData> => {
    const errors: Errors<FuneralProgramData> = {};

    if (!data.deceasedFirstName.trim()) errors.deceasedFirstName = "First Name is required.";
    if (!data.deceasedLastName.trim()) errors.deceasedLastName = "Last Name is required.";
    if (!data.dateOfBirth) errors.dateOfBirth = "Date of Birth is required.";
     else if(validateDate(data.dateOfBirth, 'Date of Birth')) errors.dateOfBirth = validateDate(data.dateOfBirth, 'Date of Birth');
    if (!data.dateOfDeath) errors.dateOfDeath = "Date of Passing is required.";
     else if(validateDate(data.dateOfDeath, 'Date of Passing')) errors.dateOfDeath = validateDate(data.dateOfDeath, 'Date of Passing');
    if (!data.serviceDate) errors.serviceDate = "Service Date is required.";
     else if(validateDate(data.serviceDate, 'Service Date')) errors.serviceDate = validateDate(data.serviceDate, 'Service Date');

    return errors;
};