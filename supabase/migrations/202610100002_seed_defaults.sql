insert into public.categories(id, user_id, name, color, is_system) values
('feira', null, 'Feira & Hortifrúti', '#16a34a', true),
('padaria', null, 'Padaria & Grãos', '#d97706', true),
('mercearia', null, 'Mercearia & Despensa', '#ea580c', true),
('carnes', null, 'Carnes & Frios', '#e11d48', true),
('laticinios', null, 'Laticínios', '#0284c7', true),
('limpeza', null, 'Higiene & Limpeza', '#7c3aed', true),
('bebidas', null, 'Bebidas', '#0d9488', true),
('outros', null, 'Outros Itens', '#475569', true);

insert into public.catalog_items(user_id, name, normalized_name, category_id, default_unit, default_price, is_system) values
(null, 'Arroz Branco 5kg', 'arroz branco 5kg', 'mercearia', 'pct', 28.90, true),
(null, 'Feijão Carioca 1kg', 'feijão carioca 1kg', 'mercearia', 'pct', 7.90, true),
(null, 'Café Torrado e Moído 500g', 'café torrado e moído 500g', 'mercearia', 'pct', 19.90, true),
(null, 'Leite Integral 1L', 'leite integral 1l', 'laticinios', 'un', 5.49, true),
(null, 'Pão Francês', 'pão francês', 'padaria', 'kg', 16.90, true),
(null, 'Banana Prata', 'banana prata', 'feira', 'kg', 6.90, true),
(null, 'Maçã Gala', 'maçã gala', 'feira', 'kg', 9.80, true),
(null, 'Detergente Neutro 500ml', 'detergente neutro 500ml', 'limpeza', 'un', 2.80, true);

insert into public.list_templates(id, user_id, name, description, emoji, market_name, target_budget, is_system) values
('feira', null, 'Feira Saudável', 'Frutas & legumes', '🍎', 'Hortifrúti da Vila', 85, true),
('basica', null, 'Despensa Básica', 'Arroz, feijão, café', '🛒', 'Supermercado Atacadista', 200, true),
('cafe', null, 'Café & Lanche', 'Pães, queijo, leite', '☕', 'Padaria & Confeitaria', 60, true),
('churrasco', null, 'Churrasco Amigos', 'Carnes & bebidas', '🥩', 'Empório de Carnes', 250, true);

insert into public.template_items(template_id, user_id, name, category_id, quantity, unit, default_price, position) values
('basica', null, 'Arroz Branco 5kg', 'mercearia', 1, 'pct', 28.90, 0),
('basica', null, 'Feijão Carioca 1kg', 'mercearia', 2, 'pct', 7.90, 1),
('basica', null, 'Café Torrado e Moído 500g', 'mercearia', 1, 'pct', 19.90, 2),
('cafe', null, 'Pão Francês', 'padaria', 1, 'kg', 16.90, 0),
('cafe', null, 'Leite Integral 1L', 'laticinios', 2, 'un', 5.49, 1),
('feira', null, 'Banana Prata', 'feira', 1, 'kg', 6.90, 0),
('feira', null, 'Maçã Gala', 'feira', 1, 'kg', 9.80, 1);
