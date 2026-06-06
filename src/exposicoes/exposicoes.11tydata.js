// Status derivado da data (calculado no build).
// "rascunho" continua rascunho; antes da data => em-breve;
// depois do fim (ou da data única) => encerrada; senão => em-cartaz.
// Normaliza para meia-noite UTC (datas do frontmatter são date-only em UTC).
function startOfDayUTC(d) {
  const x = new Date(d);
  return Date.UTC(x.getUTCFullYear(), x.getUTCMonth(), x.getUTCDate());
}

module.exports = {
  eleventyComputed: {
    effectiveStatus: (data) => {
      if (data.status === "rascunho") return "rascunho";
      if (!data.start_date) return data.status || "em-cartaz";

      const today = startOfDayUTC(new Date());
      const start = startOfDayUTC(data.start_date);
      const end = startOfDayUTC(data.end_date || data.start_date);

      if (today < start) return "em-breve";
      if (today > end) return "encerrada";
      return "em-cartaz";
    },
  },
};
