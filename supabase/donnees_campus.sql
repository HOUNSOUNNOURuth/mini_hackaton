-- ============================================================================
-- CAMPUSGO — DONNÉES DU CAMPUS (UAC Abomey-Calavi)
-- À exécuter APRÈS schema.sql, sur une base neuve.
--
-- Si votre base Supabase contient déjà ces données (ce qui est le cas au
-- moment où ce fichier est écrit, après plusieurs sessions de travail),
-- inutile de relancer ce fichier : il sert de référence écrite et permettra
-- de recréer la même base ailleurs si besoin (nouveau projet Supabase,
-- environnement de test, etc.).
--
-- AVERTISSEMENTS CONNUS (à vérifier/corriger sur place) :
-- 1. "Infirmerie universitaire" et "Infirmerie UAC" sont probablement LE
--    MÊME lieu, entré deux fois sous des noms différents. À fusionner.
-- 2. La coordonnée d'"Amphi Amousouga 3" (6.4502895, 2.3468153) est partagée
--    avec un lieu totalement différent ("Université du Dahomey") dans les
--    résultats Google Maps — probablement un simple repère de zone
--    générique (Plus Code), pas un point précis. À vérifier sur place.
-- 3. ENEAM et FSS ont leurs propres bureaux (secrétariat, scolarité...)
--    mais sont physiquement à COTONOU, pas sur le campus d'Abomey-Calavi.
-- 4. INJEPS est à PORTO-NOVO, pas sur le campus d'Abomey-Calavi.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. LIEUX (Module 2 — guidage), avec coordonnées GPS quand connues
-- ----------------------------------------------------------------------------

insert into lieux (nom, type, batiment, description, latitude, longitude, repere) values
  -- Grands bâtiments / écoles (géolocalisés)
  ('EPAC', 'ecole', 'Rue du Canada', null, 6.4142818, 2.3423477, null),
  ('ENAM', 'ecole', 'Rue Hubert Maga', null, 6.4181617, 2.3401625, null),
  ('FASHS', 'ecole', 'Rue Michel Alladayé (bâtiment partagé avec FLLAC)', null, 6.4200066, 2.3419431, null),
  ('IFRI', 'ecole', 'Rue de l''Iran', null, 6.4163194, 2.3401684, null),
  ('INE', 'ecole', 'Rue de la Ferme', null, 6.4127469, 2.3410377, null),
  ('FSA', 'ecole', 'Rue Adamou N''Diaye', null, 6.4162880, 2.3419170, null),
  ('FAST', 'ecole', 'Rue François Abiola, Centre commercial Rectorat', null, 6.4170521, 2.3450672, null),
  ('ENEAM', 'ecole', null, 'École à Cotonou (Gbégamey)', 6.3644136, 2.4083472, 'Situé à Cotonou, pas sur le campus d''Abomey-Calavi'),
  ('FSS', 'ecole', null, 'École à Cotonou (Haie-Vive-Cocotiers)', 6.3552686, 2.4080485, 'Situé à Cotonou, pas sur le campus d''Abomey-Calavi'),
  ('INJEPS', 'ecole', null, 'École à Porto-Novo', null, null, 'Situé à Porto-Novo, pas sur le campus d''Abomey-Calavi'),
  ('Bibliothèque Centrale UAC', 'bibliotheque', 'Rue Karim Dramane', null, 6.4148789, 2.3430109, null),
  ('Rectorat', 'service', 'Face au Jardin U', null, 6.4153949, 2.3439587, null),
  ('Infirmerie UAC', 'sante', null, 'Service de santé pour les étudiants, avec ambulance sur site.', 6.4133295, 2.3441669, null),
  ('Terrain de Football', 'sport', null, 'Stade universitaire, terrain en gazon synthétique.', 6.4110206, 2.3410219, null),
  ('Jardin Botanique', 'nature', null, 'Jardin Botanique et Zoologique de l''UAC.', 6.4192201, 2.3443037, null),
  ('Petit Portail', 'entree', null, null, 6.4227920, 2.3390381, null),
  ('Ecobank - Agence campus', 'banque', null, null, 6.4133264, 2.3429509, null),
  ('BOA - Agence campus', 'banque', null, null, 6.4144417, 2.3449120, null),
  ('UBA - Agence campus', 'banque', null, null, 6.4596875, 2.3564375, null),

  -- Amphithéâtres géolocalisés
  ('Amphi Ouattara', 'amphi', null, 'Nom complet : Amphithéâtre Alassane Ouattara.', 6.4192447, 2.3458355, null),
  ('Amphi Idriss Déby Itno', 'amphi', null, 'La plus grande salle de conférence de l''UAC.', 6.4213118, 2.3417629, null),
  ('Amphi Amousouga 3', 'amphi', null, null, 6.4502895, 2.3468153, 'Coordonnée possiblement approximative (zone générique) — à confirmer sur place'),
  ('Amphi B750', 'amphi', null, null, 6.4213217, 2.342578, null),
  ('Amphi A750', 'amphi', null, null, 6.4212111, 2.3427751, null),
  ('Amphi A400', 'amphi', null, null, 6.4153353, 2.3428683, null),
  ('Amphi C1000', 'amphi', null, null, 6.4197931, 2.3451361, null),
  ('Amphi A', 'amphi', null, 'Aussi appelé "Amphithéâtre A 1000".', 6.4200117, 2.3408382, null),
  ('Amphi 1000', 'amphi', null, 'Aussi appelé "Amphithéâtre A 1000".', 6.4200117, 2.3408382, null),
  ('Amphithéâtre C500', 'amphi', null, 'Trouvé en complément, pas dans la liste de départ.', 6.4160576, 2.3420110, null),
  ('Resto U (Restaurant Universitaire principal)', 'restauration', 'Campus Abomey-Calavi', 'Restaurant universitaire principal du CENOU.', 6.4176447, 2.3411150, 'Coordonnée approximative, à vérifier sur place'),

  -- Lieux sans coordonnées confirmées (repère texte uniquement)
  ('Resto Annexe', 'restauration', 'Campus Abomey-Calavi', 'Deuxième restaurant universitaire (déjeuner uniquement).', null, null, 'Position exacte à préciser sur place'),
  ('Arrêt de bus UAC', 'transport', 'Rue Circulaire des Sciences', null, null, null, 'Position exacte à préciser sur place'),
  ('CEBELAE UAC', 'service', null, null, null, null, 'Position exacte à préciser sur place'),
  ('Startup Valley', 'service', null, null, null, null, 'Position exacte à préciser sur place'),
  ('Radio Universitaire FM/UAC', 'media', null, null, null, null, 'Position exacte à préciser sur place'),
  ('UAC Web TV', 'media', null, null, null, null, 'Position exacte à préciser sur place'),
  ('COUS-AC', 'service', null, null, null, null, 'Position exacte à préciser sur place'),
  ('Jardin U', 'nature', null, null, null, null, 'Position exacte à préciser sur place'),
  ('Marché du campus', 'commerce', null, null, null, null, 'Position exacte à préciser sur place'),
  ('Cantines du campus', 'restauration', null, 'Plusieurs cantines réparties sur le campus.', null, null, 'Position exacte à préciser sur place'),
  ('Grand Portail', 'entree', null, null, null, null, 'Position exacte à préciser sur place'),
  ('Petit Portail Zogbadjè', 'entree', null, null, null, null, 'Position exacte à préciser sur place'),
  ('Dortoirs / Résidences universitaires', 'logement', null, null, null, null, 'Position exacte à préciser sur place'),
  ('Amphi Houégbadja', 'amphi', null, null, null, null, 'Position exacte à préciser sur place'),
  ('Amphi Etisalat', 'amphi', null, null, null, null, 'Position exacte à préciser sur place'),
  ('Amphi Mamadou Coulibaly', 'amphi', null, null, null, null, 'Position exacte à préciser sur place'),
  ('Amphi ODD', 'amphi', null, null, null, null, 'Position exacte à préciser sur place'),
  ('Amphi UEMOA', 'amphi', null, null, null, null, 'Position exacte à préciser sur place'),
  ('Amphi Avicenne', 'amphi', null, null, null, null, 'Position exacte à préciser sur place'),
  ('Amphibi', 'amphi', null, null, null, null, 'Position exacte à préciser sur place'),
  ('Amphi Apartement', 'amphi', null, null, null, null, 'Position exacte à préciser sur place'),
  ('Amphi Amousouga 1', 'amphi', null, null, null, null, 'Position exacte à préciser sur place'),
  ('Amphi Amousouga 2', 'amphi', null, null, null, null, 'Position exacte à préciser sur place'),
  ('Amphi B', 'amphi', null, null, null, null, 'Position exacte à préciser sur place'),
  ('Amphi C', 'amphi', null, null, null, null, 'Position exacte à préciser sur place'),
  ('Amphi 500', 'amphi', null, null, null, null, 'Position exacte à préciser sur place'),
  ('Amphi 600', 'amphi', null, null, null, null, 'Position exacte à préciser sur place'),
  ('Amphi B500', 'amphi', null, null, null, null, 'Position exacte à préciser sur place'),
  ('Amphi B2', 'amphi', null, null, null, null, 'Position exacte à préciser sur place'),
  ('Amphi B200', 'amphi', null, null, null, null, 'Position exacte à préciser sur place'),
  ('Amphi B3', 'amphi', null, null, null, null, 'Position exacte à préciser sur place'),
  ('Amphi Iran 1', 'amphi', 'Rue de l''Iran (même bâtiment que l''administration IFRI)', null, 6.4163609, 2.3401809, null),
  ('Amphi Iran 2', 'amphi', 'Rue de l''Iran (même bâtiment que l''administration IFRI)', null, 6.4163609, 2.3401809, null),

  -- Bureaux administratifs par école (secrétariat, direction, scolarité, bibliothèque)
  -- Ces lieux sont utilisés comme "lieu_id" par la table "bureaux" plus bas.
  ('Secrétariat EPAC', 'bureau', 'À préciser', null, null, null, null),
  ('Bureau du Directeur EPAC', 'bureau', 'À préciser', null, null, null, null),
  ('Secrétariat FADESP', 'bureau', 'À préciser', null, null, null, null),
  ('Décanat FADESP', 'bureau', 'À préciser', null, null, null, null),
  ('Scolarité FADESP', 'bureau', 'À préciser', null, null, null, null),
  ('Bibliothèque FADESP', 'bureau', 'À préciser', null, null, null, null),
  ('Secrétariat FASEG', 'bureau', 'À préciser', null, null, null, null),
  ('Décanat FASEG', 'bureau', 'À préciser', null, null, null, null),
  ('Scolarité FASEG', 'bureau', 'À préciser', null, null, null, null),
  ('Bibliothèque FASEG', 'bureau', 'À préciser', null, null, null, null),
  ('Secrétariat FAST', 'bureau', 'À préciser', null, null, null, null),
  ('Décanat FAST', 'bureau', 'À préciser', null, null, null, null),
  ('Scolarité FAST', 'bureau', 'À préciser', null, null, null, null),
  ('Bibliothèque FAST', 'bureau', 'À préciser', null, null, null, null),
  ('Secrétariat FSA', 'bureau', 'À préciser', null, null, null, null),
  ('Décanat FSA', 'bureau', 'À préciser', null, null, null, null),
  ('Scolarité FSA', 'bureau', 'À préciser', null, null, null, null),
  ('Bibliothèque FSA', 'bureau', 'À préciser', null, null, null, null),
  ('Secrétariat FSS', 'bureau', 'À préciser', null, null, null, null),
  ('Décanat FSS', 'bureau', 'À préciser', null, null, null, null),
  ('Scolarité FSS', 'bureau', 'À préciser', null, null, null, null),
  ('Bibliothèque FSS', 'bureau', 'À préciser', null, null, null, null),
  ('Secrétariat ENEAM', 'bureau', 'À préciser', null, null, null, null),
  ('Direction ENEAM', 'bureau', 'À préciser', null, null, null, null),
  ('Scolarité ENEAM', 'bureau', 'À préciser', null, null, null, null),
  ('Bibliothèque ENEAM', 'bureau', 'À préciser', null, null, null, null),
  ('Scolarité EPAC', 'bureau', 'À préciser', null, null, null, null),
  ('Bibliothèque EPAC', 'bureau', 'À préciser', null, null, null, null),
  ('Secrétariat IFRI', 'bureau', 'À préciser', null, null, null, null),
  ('Direction IFRI', 'bureau', 'À préciser', null, null, null, null),
  ('Scolarité IFRI', 'bureau', 'À préciser', null, null, null, null),
  ('Bibliothèque IFRI', 'bureau', 'À préciser', null, null, null, null),
  ('Secrétariat INE', 'bureau', 'À préciser', null, null, null, null),
  ('Direction INE', 'bureau', 'À préciser', null, null, null, null),
  ('Scolarité INE', 'bureau', 'À préciser', null, null, null, null),
  ('Bibliothèque INE', 'bureau', 'À préciser', null, null, null, null),
  ('Secrétariat ICAV', 'bureau', 'À préciser', null, null, null, null),
  ('Direction ICAV', 'bureau', 'À préciser', null, null, null, null),
  ('Scolarité ICAV', 'bureau', 'À préciser', null, null, null, null),
  ('Bibliothèque ICAV', 'bureau', 'À préciser', null, null, null, null),
  ('Secrétariat ENAM', 'bureau', 'À préciser', null, null, null, null),
  ('Direction ENAM', 'bureau', 'À préciser', null, null, null, null),
  ('Scolarité ENAM', 'bureau', 'À préciser', null, null, null, null),
  ('Bibliothèque ENAM', 'bureau', 'À préciser', null, null, null, null),
  ('CROU - Guichet des bourses', 'service', 'Site du CENOU, Abomey-Calavi', null, null, null, null),
  ('CROU - Restauration/Transport', 'service', 'Site du CENOU, Abomey-Calavi', null, null, null, null);


-- ----------------------------------------------------------------------------
-- 2. BUREAUX (Module 1), reliés aux lieux ci-dessus
-- ----------------------------------------------------------------------------

insert into bureaux (nom, categorie, ecole, lieu_id, quota_par_jour)
select 'Secrétariat', 'Secrétariat', 'EPAC', id, 60 from lieux where nom = 'Secrétariat EPAC'
union all select 'Bureau du Directeur', 'Direction', 'EPAC', id, 10 from lieux where nom = 'Bureau du Directeur EPAC'
union all select 'Scolarité', 'Scolarité', 'EPAC', id, 50 from lieux where nom = 'Scolarité EPAC'
union all select 'Bibliothèque', 'Bibliothèque', 'EPAC', id, 40 from lieux where nom = 'Bibliothèque EPAC'

union all select 'Secrétariat', 'Secrétariat', 'FADESP', id, 50 from lieux where nom = 'Secrétariat FADESP'
union all select 'Décanat', 'Direction', 'FADESP', id, 10 from lieux where nom = 'Décanat FADESP'
union all select 'Scolarité', 'Scolarité', 'FADESP', id, 50 from lieux where nom = 'Scolarité FADESP'
union all select 'Bibliothèque', 'Bibliothèque', 'FADESP', id, 40 from lieux where nom = 'Bibliothèque FADESP'

union all select 'Secrétariat', 'Secrétariat', 'FASEG', id, 50 from lieux where nom = 'Secrétariat FASEG'
union all select 'Décanat', 'Direction', 'FASEG', id, 10 from lieux where nom = 'Décanat FASEG'
union all select 'Scolarité', 'Scolarité', 'FASEG', id, 50 from lieux where nom = 'Scolarité FASEG'
union all select 'Bibliothèque', 'Bibliothèque', 'FASEG', id, 40 from lieux where nom = 'Bibliothèque FASEG'

union all select 'Secrétariat', 'Secrétariat', 'FAST', id, 50 from lieux where nom = 'Secrétariat FAST'
union all select 'Décanat', 'Direction', 'FAST', id, 10 from lieux where nom = 'Décanat FAST'
union all select 'Scolarité', 'Scolarité', 'FAST', id, 50 from lieux where nom = 'Scolarité FAST'
union all select 'Bibliothèque', 'Bibliothèque', 'FAST', id, 40 from lieux where nom = 'Bibliothèque FAST'

union all select 'Secrétariat', 'Secrétariat', 'FSA', id, 40 from lieux where nom = 'Secrétariat FSA'
union all select 'Décanat', 'Direction', 'FSA', id, 10 from lieux where nom = 'Décanat FSA'
union all select 'Scolarité', 'Scolarité', 'FSA', id, 40 from lieux where nom = 'Scolarité FSA'
union all select 'Bibliothèque', 'Bibliothèque', 'FSA', id, 30 from lieux where nom = 'Bibliothèque FSA'

union all select 'Secrétariat', 'Secrétariat', 'FSS', id, 60 from lieux where nom = 'Secrétariat FSS'
union all select 'Décanat', 'Direction', 'FSS', id, 10 from lieux where nom = 'Décanat FSS'
union all select 'Scolarité', 'Scolarité', 'FSS', id, 60 from lieux where nom = 'Scolarité FSS'
union all select 'Bibliothèque', 'Bibliothèque', 'FSS', id, 40 from lieux where nom = 'Bibliothèque FSS'

union all select 'Secrétariat', 'Secrétariat', 'ENEAM', id, 50 from lieux where nom = 'Secrétariat ENEAM'
union all select 'Direction', 'Direction', 'ENEAM', id, 10 from lieux where nom = 'Direction ENEAM'
union all select 'Scolarité', 'Scolarité', 'ENEAM', id, 50 from lieux where nom = 'Scolarité ENEAM'
union all select 'Bibliothèque', 'Bibliothèque', 'ENEAM', id, 40 from lieux where nom = 'Bibliothèque ENEAM'

union all select 'Secrétariat', 'Secrétariat', 'IFRI', id, 40 from lieux where nom = 'Secrétariat IFRI'
union all select 'Direction', 'Direction', 'IFRI', id, 10 from lieux where nom = 'Direction IFRI'
union all select 'Scolarité', 'Scolarité', 'IFRI', id, 40 from lieux where nom = 'Scolarité IFRI'
union all select 'Bibliothèque', 'Bibliothèque', 'IFRI', id, 30 from lieux where nom = 'Bibliothèque IFRI'

union all select 'Secrétariat', 'Secrétariat', 'INE', id, 30 from lieux where nom = 'Secrétariat INE'
union all select 'Direction', 'Direction', 'INE', id, 10 from lieux where nom = 'Direction INE'
union all select 'Scolarité', 'Scolarité', 'INE', id, 30 from lieux where nom = 'Scolarité INE'
union all select 'Bibliothèque', 'Bibliothèque', 'INE', id, 20 from lieux where nom = 'Bibliothèque INE'

union all select 'Secrétariat', 'Secrétariat', 'ICAV', id, 30 from lieux where nom = 'Secrétariat ICAV'
union all select 'Direction', 'Direction', 'ICAV', id, 10 from lieux where nom = 'Direction ICAV'
union all select 'Scolarité', 'Scolarité', 'ICAV', id, 30 from lieux where nom = 'Scolarité ICAV'
union all select 'Bibliothèque', 'Bibliothèque', 'ICAV', id, 20 from lieux where nom = 'Bibliothèque ICAV'

union all select 'Secrétariat', 'Secrétariat', 'ENAM', id, 40 from lieux where nom = 'Secrétariat ENAM'
union all select 'Direction', 'Direction', 'ENAM', id, 10 from lieux where nom = 'Direction ENAM'
union all select 'Scolarité', 'Scolarité', 'ENAM', id, 40 from lieux where nom = 'Scolarité ENAM'
union all select 'Bibliothèque', 'Bibliothèque', 'ENAM', id, 30 from lieux where nom = 'Bibliothèque ENAM'

union all select 'UBA', 'Banque', null, id, 30 from lieux where nom = 'UBA - Agence campus'
union all select 'BOA', 'Banque', null, id, 30 from lieux where nom = 'BOA - Agence campus'
union all select 'Ecobank', 'Banque', null, id, 30 from lieux where nom = 'Ecobank - Agence campus'

union all select 'CROU - Bourses', 'Bourses', 'Rectorat', id, 80 from lieux where nom = 'CROU - Guichet des bourses'
union all select 'CROU - Restauration/Transport', 'Services aux étudiants', 'Rectorat', id, 100 from lieux where nom = 'CROU - Restauration/Transport'
union all select 'Bibliothèque Centrale', 'Bibliothèque', 'Rectorat', id, 60 from lieux where nom = 'Bibliothèque Centrale UAC';
