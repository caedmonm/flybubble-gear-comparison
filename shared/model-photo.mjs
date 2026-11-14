// Photos belong to a model; every size in the preview shares its review decision.
export const photoKey = (brand, model) =>
  JSON.stringify(
    [brand, model].map((value) =>
      String(value || '')
        .trim()
        .toLowerCase(),
    ),
  );
