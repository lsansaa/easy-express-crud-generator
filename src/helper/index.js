const {
  CONTAINS, CONTAINSS, NCONTAINS, NCONTAINSS,
  LIMIT, SKIP, SORT, ASC, DESC,
  allFilterSuffix, sortSuffix,
} = require('../constants');

module.exports.getPopulateAndSelect = (param) => {
  const obj = { populate: [], select: {} };
  const arr = param ? param.split('/') : '';

  if (!arr || !Array.isArray(arr) || arr.length === 0) return obj;

  arr.filter(x => !!x).forEach((x) => {
    const fields = x.split('.');

    if (fields[0][0] === '_' && fields.length > 1) {
      const fieldExist = obj.populate.find(i => i.path === fields[0]);
      if (!fieldExist) {
        obj.populate.push({ path: fields[0], select: { [fields[1]]: true } });
      } else if (!fieldExist.select[fields[1]]) {
        fieldExist.select[fields[1]] = true;
      }
    }

    obj.select[fields[0]] = true;
  });

  return obj;
};

module.exports.getQueryObj = (queryObj = {}) => {
  const keys = Object.keys(queryObj);
  if (keys.length === 0) return queryObj;

  const obj = {
    query: {}, sort: {}, limit: 50, skip: 0,
  };

  keys.filter(x => !!x).forEach((x) => {
    // mongo id filter
    if (x === '_id') {
      obj.query._id = queryObj[x];
      return;
    }

    // sorting and pagination
    if (x.includes('_') && sortSuffix.includes(x)) {
      if (x === LIMIT) {
        obj.limit = Math.round(parseInt(queryObj[x], 10)) || 0;
        return;
      }

      if (x === SKIP) {
        obj.skip = Math.round(parseInt(queryObj[x], 10)) || 0;
        return;
      }

      if (x === SORT) {
        queryObj[x].split(',').forEach((z) => {
          const [field, order] = z.split(':');
          if (order === ASC || order === DESC) obj.sort[field] = order;
        });
        return;
      }
    }

    // filters
    allFilterSuffix.forEach((y) => {
      if (x.includes(y)) {
        const field = x.replace(`_${y}`, '');
        switch (y) {
          case (CONTAINS):
            obj.query[field] = { $regex: new RegExp(queryObj[x], 'i') };
            break;
          case (CONTAINSS):
            obj.query[field] = { $regex: new RegExp(queryObj[x]) };
            break;
          case (NCONTAINS):
            obj.query[field] = { $not: { $regex: new RegExp(queryObj[x], 'i') } };
            break;
          case (NCONTAINSS):
            obj.query[field] = { $not: { $regex: new RegExp(queryObj[x]) } };
            break;
          default:
            obj.query[field] = { [`$${y}`]: queryObj[x] };
            break;
        }
      }
    });
  });

  return obj;
};
