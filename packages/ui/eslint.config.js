import { base, packageZones } from "@sharq/eslint-config";

export default [
  ...base,
  packageZones({ self: "ui", allowed: ["schemas", "locales"] }),
];
