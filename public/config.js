import { Core, MiniCore, ExtraLocal, Spanish } from './packages.js';

// Locale configuration (neighborhood, oceaneast, urban, southwest)
const locale = "neighborhood";

const affiliateName = "Comcast Digital Cable";

const apiKey = '';

// Define available packages in a fixed order
const availablePackageFunctions = [Core, MiniCore, ExtraLocal, Spanish];
// Read user selection from localStorage if available, otherwise use default ([Core, Spanish])
const storedEnabled = localStorage.getItem('enabledPackages');
const enabledPackageFunctions = storedEnabled 
	? availablePackageFunctions.filter(fn => storedEnabled.split(',').includes(fn.name))
	: [Core, Spanish];

const enabledPackages = enabledPackageFunctions.map(fn => fn(locale));
const enabledPackageNames = enabledPackageFunctions.map(fn => fn.name);

export { locale, affiliateName, enabledPackages, apiKey, enabledPackageNames };