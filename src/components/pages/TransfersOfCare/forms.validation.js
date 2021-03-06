import { valuesNames } from './forms.config';

const validateForm = (values) => {
  const errors = {};
  errors[valuesNames.FROM] = !values[valuesNames.FROM] ? 'You must enter a value.' : null;
  errors[valuesNames.TO] = !values[valuesNames.TO] ? 'You must enter a value.' : null;
  errors[valuesNames.RECORDS] = !values[valuesNames.RECORDS] ? 'You must enter a value.' : null;
  errors[valuesNames.REASON] = !values[valuesNames.REASON] ? 'You must enter a value.' : null;
  errors[valuesNames.CLINICAL] = !values[valuesNames.CLINICAL] ? 'You must enter a value.' : null;
  errors[valuesNames.DATE_TIME] = !values[valuesNames.DATE_TIME] ? 'You must enter a value.' : null;

  return errors
};

export { validateForm }
