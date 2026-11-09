import { Router } from 'express';
import { pool } from '../index.js';
import { requireAuth } from '../middleware/auth.js';
const router = Router();
const allowedTypes = ['apartment','house','villa','plot','commercial'];
const allowedListing = ['sale','rent'];
function validate(body) {
  const required = ['title','description','price','listing_type','property_type','city','address','area_sqft'];
  if (required.some(k => body[k] === undefined || String(body[k]).trim() === '')) return 'Please fill in all required fields.';
  if (!Number.isFinite(Number(body.price)) || Number(body.price) <= 0 || !Number.isFinite(Number(body.area_sqft)) || Number(body.area_sqft) <= 0) return 'Price and area must be positive numbers.';
  if (!allowedTypes.includes(body.property_type) || !allowedListing.includes(body.listing_type)) return 'Choose a valid property and listing type.';
  return null;
}
router.get('/', async (req, res, next) => {
  try {
    const { search='', city='', listingType='', propertyType='', minPrice='', maxPrice='', sort='newest' } = req.query;
    // Use a dedicated placeholder for search to avoid interpolating user input into SQL.
    let sql = 'SELECT p.*, u.name AS owner_name FROM properties p LEFT JOIN users u ON u.id=p.owner_id';
    const clauses=[]; const params=[];
    if (search) { params.push(`%${search}%`); const n=params.length; clauses.push(`(p.title ILIKE $${n} OR p.description ILIKE $${n} OR p.city ILIKE $${n})`); }
    if (city) { params.push(`%${city}%`); clauses.push(`p.city ILIKE $${params.length}`); }
    if (listingType && allowedListing.includes(listingType)) { params.push(listingType); clauses.push(`p.listing_type=$${params.length}`); }
    if (propertyType && allowedTypes.includes(propertyType)) { params.push(propertyType); clauses.push(`p.property_type=$${params.length}`); }
    if (minPrice !== '' && Number.isFinite(Number(minPrice))) { params.push(Number(minPrice)); clauses.push(`p.price >= $${params.length}`); }
    if (maxPrice !== '' && Number.isFinite(Number(maxPrice))) { params.push(Number(maxPrice)); clauses.push(`p.price <= $${params.length}`); }
    if (clauses.length) sql += ' WHERE ' + clauses.join(' AND ');
    sql += sort === 'price-asc' ? ' ORDER BY p.price ASC' : sort === 'price-desc' ? ' ORDER BY p.price DESC' : ' ORDER BY p.created_at DESC';
    const result = await pool.query(sql, params); res.json(result.rows);
  } catch (err) { next(err); }
});
router.get('/:id', async (req, res, next) => {
  try { const result = await pool.query('SELECT p.*,u.name AS owner_name,u.email AS owner_email FROM properties p LEFT JOIN users u ON u.id=p.owner_id WHERE p.id=$1', [req.params.id]); if (!result.rows[0]) return res.status(404).json({ message: 'Property not found.' }); res.json(result.rows[0]); }
  catch (err) { next(err); }
});
router.post('/', requireAuth, async (req, res, next) => {
  const error=validate(req.body); if(error) return res.status(400).json({message:error});
  try { const b=req.body; const result=await pool.query(`INSERT INTO properties(owner_id,title,description,price,listing_type,property_type,city,address,bedrooms,bathrooms,area_sqft,image_url,amenities)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`, [req.user.id,b.title.trim(),b.description.trim(),Number(b.price),b.listing_type,b.property_type,b.city.trim(),b.address.trim(),Number(b.bedrooms||0),Number(b.bathrooms||0),Number(b.area_sqft),b.image_url||null,Array.isArray(b.amenities)?b.amenities:[]]); res.status(201).json(result.rows[0]); }
  catch(err){next(err);}
});
router.put('/:id', requireAuth, async (req,res,next)=>{
  const error=validate(req.body); if(error) return res.status(400).json({message:error});
  try { const b=req.body; const result=await pool.query(`UPDATE properties SET title=$1,description=$2,price=$3,listing_type=$4,property_type=$5,city=$6,address=$7,bedrooms=$8,bathrooms=$9,area_sqft=$10,image_url=$11,amenities=$12 WHERE id=$13 AND owner_id=$14 RETURNING *`,[b.title.trim(),b.description.trim(),Number(b.price),b.listing_type,b.property_type,b.city.trim(),b.address.trim(),Number(b.bedrooms||0),Number(b.bathrooms||0),Number(b.area_sqft),b.image_url||null,Array.isArray(b.amenities)?b.amenities:[],req.params.id,req.user.id]); if(!result.rows[0]) return res.status(404).json({message:'Listing not found or you do not own it.'}); res.json(result.rows[0]); }
  catch(err){next(err);}
});
router.delete('/:id', requireAuth, async (req,res,next)=>{
  try { const result=await pool.query('DELETE FROM properties WHERE id=$1 AND owner_id=$2 RETURNING id',[req.params.id,req.user.id]); if(!result.rows[0]) return res.status(404).json({message:'Listing not found or you do not own it.'}); res.json({message:'Property deleted.'}); }
  catch(err){next(err);}
});
export default router;
