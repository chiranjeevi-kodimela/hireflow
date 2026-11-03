const path = require("path");

const getExportDir = () =>
  process.env.HIRE_FLOW_EXPORT_DIR
    ? path.resolve(process.env.HIRE_FLOW_EXPORT_DIR)
    : path.join(__dirname, "../../exports");

module.exports = { getExportDir };
