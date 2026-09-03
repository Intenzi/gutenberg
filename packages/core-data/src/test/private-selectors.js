import { getUndoManager } from '../private-selectors';
import { getSyncManager } from '../sync';

jest.mock( '../sync', () => ( {
	getSyncManager: jest.fn(),
} ) );

describe( 'getUndoManager', () => {
	afterEach( () => {
		getSyncManager.mockReset();
	} );

	it( 'delegates to local undo manager for non-synced entity changes when sync undo manager is active', () => {
		const syncUndoManager = {
			addRecord: jest.fn(),
			hasRedo: jest.fn( () => false ),
			hasUndo: jest.fn( () => false ),
			redo: jest.fn(),
			undo: jest.fn(),
		};
		const fallbackUndoManager = {
			addRecord: jest.fn(),
			hasRedo: jest.fn( () => false ),
			hasUndo: jest.fn( () => true ),
			redo: jest.fn(),
			undo: jest.fn( () => [ { id: 'test' } ] ),
		};
		getSyncManager.mockReturnValue( {
			undoManager: syncUndoManager,
		} );

		const state = {
			entities: {
				config: [
					{
						kind: 'plugin',
						name: 'table',
						// No syncConfig -> non-synced
					},
					{
						kind: 'postType',
						name: 'post',
						syncConfig: {}, // Synced
					},
				],
			},
			undoManager: fallbackUndoManager,
			syncUndoManagerState: {
				hasRedo: false,
				hasUndo: false,
			},
		};

		const manager = getUndoManager( state );

		// Non-synced record addition
		const nonSyncedRecord = [
			{
				id: { kind: 'plugin', name: 'table', recordId: 1 },
				changes: { title: { from: 'A', to: 'B' } },
			},
		];
		manager.addRecord( nonSyncedRecord );
		expect( fallbackUndoManager.addRecord ).toHaveBeenCalledWith(
			nonSyncedRecord,
			false
		);
		expect( syncUndoManager.addRecord ).not.toHaveBeenCalled();

		// Synced record addition
		const syncedRecord = [
			{
				id: { kind: 'postType', name: 'post', recordId: 1 },
				changes: { title: { from: 'X', to: 'Y' } },
			},
		];
		manager.addRecord( syncedRecord );
		expect( syncUndoManager.addRecord ).toHaveBeenCalledWith(
			syncedRecord,
			false
		);

		// Undo delegation
		expect( manager.hasUndo() ).toBe( true );
		expect( manager.undo() ).toEqual( [ { id: 'test' } ] );
		expect( fallbackUndoManager.undo ).toHaveBeenCalled();
	} );

	it( 'returns the default undo manager when there is no sync undo manager', () => {
		const fallbackUndoManager = {
			addRecord: jest.fn(),
			hasRedo: jest.fn(),
			hasUndo: jest.fn(),
			redo: jest.fn(),
			undo: jest.fn(),
		};
		getSyncManager.mockReturnValue( undefined );

		expect(
			getUndoManager( {
				undoManager: fallbackUndoManager,
				syncUndoManagerState: {
					hasRedo: false,
					hasUndo: false,
				},
			} )
		).toBe( fallbackUndoManager );
	} );
} );
